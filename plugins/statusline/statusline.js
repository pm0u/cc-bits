#!/usr/bin/env node
// Enhanced Claude Code Statusline
// Shows: model | directory | context usage | session usage | weekly usage

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

// Cache file for usage data
const CACHE_FILE = '/tmp/cc-statusline-cache.json';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Format directory to show up to 2 folders deep
function formatDir(dir) {
  const parts = dir.split(path.sep).filter(Boolean);
  if (parts.length <= 2) {
    return dir.startsWith('/') ? '/' + parts.join('/') : parts.join('/');
  }
  return '.../' + parts.slice(-2).join('/');
}

// Format time duration (ms to human readable)
function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format reset time display (relative only)
function formatResetTime(isoString) {
  const resetDate = new Date(isoString);
  const now = new Date();
  const msUntilReset = resetDate - now;

  const relTime = formatDuration(msUntilReset);

  return `\x1b[2m↻ ${relTime}\x1b[0m`;
}

// Create progress bar
function createProgressBar(percentage, label) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  const filled = Math.floor(pct / 20);
  const bar = '█'.repeat(filled) + '░'.repeat(5 - filled);

  let color;
  if (pct < 63) {
    color = '\x1b[32m'; // Green
  } else if (pct < 81) {
    color = '\x1b[33m'; // Yellow
  } else if (pct < 95) {
    color = '\x1b[38;5;208m'; // Orange
  } else {
    color = '\x1b[31m'; // Red
  }

  return `${label} ${color}${bar} ${pct}%\x1b[0m`;
}

// Fetch usage data from Anthropic API
async function fetchUsageData() {
  return new Promise((resolve, reject) => {
    try {
      // Read credentials
      const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
      if (!fs.existsSync(credPath)) {
        return resolve(null);
      }

      const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      const token = creds.claudeAiOauth?.accessToken || creds.oauth_token || creds.access_token;

      if (!token) {
        return resolve(null);
      }

      const options = {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'claude-code/2.0',
          'anthropic-beta': 'oauth-2025-04-20'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    } catch (e) {
      resolve(null);
    }
  });
}

// Get cached or fresh usage data
async function getUsageData() {
  try {
    // Check cache
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      const age = Date.now() - cached.timestamp;

      if (age < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    // Fetch fresh data
    const data = await fetchUsageData();

    if (data) {
      // Cache it
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    }

    return data;
  } catch (e) {
    return null;
  }
}

// Get current git branch
function getGitBranch(cwd) {
  try {
    const { execSync } = require('child_process');
    const branch = execSync('git branch --show-current', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return branch || null;
  } catch (e) {
    return null;
  }
}

// Main function
async function main() {
  try {
    let input = '';

    // Read stdin
    await new Promise((resolve) => {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => input += chunk);
      process.stdin.on('end', resolve);
    });

    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const remaining = data.context_window?.remaining_percentage;
    const branch = getGitBranch(dir);

    // Get usage data
    const usage = await getUsageData();
    const hasUsageLimits = usage && (usage.five_hour || usage.seven_day);

    // Build context bar
    let ctxBar = '';
    if (remaining != null) {
      const rem = Math.round(remaining);
      const rawUsed = Math.max(0, Math.min(100, 100 - rem));
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));

      const filled = Math.floor(used / 20);
      const bar = '█'.repeat(filled) + '░'.repeat(5 - filled);

      let color;
      if (used < 63) {
        color = '\x1b[32m';
      } else if (used < 81) {
        color = '\x1b[33m';
      } else if (used < 95) {
        color = '\x1b[38;5;208m';
      } else {
        color = '\x1b[31m';
      }

      ctxBar = `ctx ${color}${bar} ${used}%\x1b[0m`;
    }

    // Line 1: model │ directory │ branch
    const line1Parts = [`\x1b[2m${model}\x1b[0m`, `\x1b[2m${formatDir(dir)}\x1b[0m`];
    if (branch) {
      line1Parts.push(`\x1b[2m ${branch}\x1b[0m`);
    }

    const lines = [line1Parts.join(' │ ')];

    // Line 2: context │ usage limits (all on one line)
    const line2Parts = [];

    if (ctxBar) {
      line2Parts.push(ctxBar);
    }

    if (hasUsageLimits) {
      if (usage.five_hour) {
        const sessionPct = usage.five_hour.utilization || 0;
        const sessionBar = createProgressBar(sessionPct, '5h');
        const sessionReset = formatResetTime(usage.five_hour.resets_at);
        line2Parts.push(`${sessionBar} ${sessionReset}`);
      }

      if (usage.seven_day) {
        const weeklyPct = usage.seven_day.utilization || 0;
        const weeklyBar = createProgressBar(weeklyPct, '7d');
        const weeklyReset = formatResetTime(usage.seven_day.resets_at);
        line2Parts.push(`${weeklyBar} ${weeklyReset}`);
      }
    }

    if (line2Parts.length > 0) {
      lines.push(line2Parts.join(' │ '));
    }

    process.stdout.write(lines.join('\n'));
  } catch (e) {
    // Silent fail
  }
}

main();
