#!/usr/bin/env node
// Custom Claude Code Statusline
// Shows: model | directory (up to 3 folders deep) | context usage

const fs = require('fs');
const path = require('path');
const os = require('os');

// Format directory to show up to 3 folders deep
function formatDir(dir) {
  const parts = dir.split(path.sep).filter(Boolean);
  if (parts.length <= 3) {
    return dir.startsWith('/') ? '/' + parts.join('/') : parts.join('/');
  }
  return '.../' + parts.slice(-3).join('/');
}

// Read JSON from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const remaining = data.context_window?.remaining_percentage;

    // Context window display (shows USED percentage scaled to 80% limit)
    let ctx = '';
    if (remaining != null) {
      const rem = Math.round(remaining);
      const rawUsed = Math.max(0, Math.min(100, 100 - rem));
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));

      const filled = Math.floor(used / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

      if (used < 63) {
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 81) {
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 95) {
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m💀 ${bar} ${used}%\x1b[0m`;
      }
    }

    // Output with formatted directory
    const formattedDir = formatDir(dir);
    process.stdout.write(`\x1b[2m${model}\x1b[0m │ \x1b[2m${formattedDir}\x1b[0m │ ${ctx}`);
  } catch (e) {
    // Silent fail
  }
});
