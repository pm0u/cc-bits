#!/usr/bin/env node

/**
 * FUCKIT Tools — CLI utility for FUCKIT workflow operations
 *
 * Based on GSD v1.15.0 optimization pattern: read files once, not twice.
 *
 * Usage: node fuckit-tools.js <command> [args]
 *
 * Commands:
 *   init execute-phase <phase> [--include=file1,file2,...]
 *     Returns all context for execute-phase workflow
 *     Available includes: state, config, roadmap, requirements, context, research
 *
 *   init plan-phase <phase> [--include=file1,file2,...]
 *     Returns all context for plan-phase workflow
 *     Available includes: state, config, roadmap, requirements, context, research, verification, uat
 */

const fs = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeRead(filepath, defaultVal = null) {
  try {
    return fs.readFileSync(filepath, 'utf-8');
  } catch {
    return defaultVal;
  }
}

function safeReadJSON(filepath, defaultVal = {}) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return defaultVal;
  }
}

function pathExists(filepath) {
  try {
    fs.accessSync(filepath);
    return true;
  } catch {
    return false;
  }
}

function loadConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const defaults = {
    model_profile: 'balanced',
    commit_docs: true,
    parallelization: true,
    branching_strategy: 'none',
    phase_branch_template: 'fuckit/phase-{phase}-{slug}',
    milestone_branch_template: 'fuckit/{milestone}-{slug}',
    research: true,
    plan_checker: true,
    verifier: true,
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Handle nested config structure
    const get = (key, nested) => {
      if (parsed[key] !== undefined) return parsed[key];
      if (nested && parsed[nested.section] && parsed[nested.section][nested.field] !== undefined) {
        return parsed[nested.section][nested.field];
      }
      return undefined;
    };

    // Handle parallelization (can be boolean or object)
    const parallelization = (() => {
      const val = get('parallelization');
      if (typeof val === 'boolean') return val;
      if (typeof val === 'object' && val !== null && 'enabled' in val) return val.enabled;
      return defaults.parallelization;
    })();

    return {
      model_profile: get('model_profile') ?? defaults.model_profile,
      commit_docs: get('commit_docs', { section: 'planning', field: 'commit_docs' }) ?? defaults.commit_docs,
      branching_strategy: get('branching_strategy', { section: 'git', field: 'branching_strategy' }) ?? defaults.branching_strategy,
      phase_branch_template: get('phase_branch_template', { section: 'git', field: 'phase_branch_template' }) ?? defaults.phase_branch_template,
      milestone_branch_template: get('milestone_branch_template', { section: 'git', field: 'milestone_branch_template' }) ?? defaults.milestone_branch_template,
      research: get('research', { section: 'workflow', field: 'research' }) ?? defaults.research,
      plan_checker: get('plan_checker', { section: 'workflow', field: 'plan_check' }) ?? defaults.plan_checker,
      verifier: get('verifier', { section: 'workflow', field: 'verifier' }) ?? defaults.verifier,
      parallelization,
    };
  } catch {
    return defaults;
  }
}

function findPhaseDir(cwd, phase) {
  const normalized = phase.replace(/^0+/, '');
  const padded = normalized.padStart(2, '0');

  const planningPhases = path.join(cwd, '.planning', 'phases');

  try {
    const dirs = fs.readdirSync(planningPhases);

    // Try exact matches first
    for (const pattern of [padded, normalized]) {
      const match = dirs.find(d => d.startsWith(pattern + '-'));
      if (match) return path.join(planningPhases, match);
    }

    return null;
  } catch {
    return null;
  }
}

function resolveModel(profile, agentType) {
  const MODEL_PROFILES = {
    'fuckit:executor':           { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
    'fuckit:planner':            { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
    'fuckit:phase-researcher':   { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
    'fuckit:project-researcher': { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
    'fuckit:verifier':           { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
    'fuckit:plan-checker':       { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
    'fuckit:debugger':           { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  };

  const table = MODEL_PROFILES[agentType];
  if (!table) return 'sonnet'; // default

  return table[profile] || table.balanced;
}

function extractFrontmatter(filepath) {
  const content = safeRead(filepath, '');
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const key = keyMatch[1];
    const value = keyMatch[2].trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      // Array value
      result[key] = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else if (value === 'true' || value === 'false') {
      // Boolean value
      result[key] = value === 'true';
    } else if (!isNaN(value) && value !== '') {
      // Number value
      result[key] = Number(value);
    } else {
      // String value
      result[key] = value;
    }
  }

  return result;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdInitExecutePhase(cwd, phase, includes) {
  if (!phase) {
    console.error('ERROR: phase required for init execute-phase');
    process.exit(1);
  }

  const config = loadConfig(cwd);
  const phaseDir = findPhaseDir(cwd, phase);

  const result = {
    // Config values
    config: {
      model_profile: config.model_profile,
      commit_docs: config.commit_docs,
      parallelization: config.parallelization,
      branching_strategy: config.branching_strategy,
      phase_branch_template: config.phase_branch_template,
      milestone_branch_template: config.milestone_branch_template,
      verifier: config.verifier,
    },

    // Models (resolved from profile)
    models: {
      executor: resolveModel(config.model_profile, 'fuckit:executor'),
      verifier: resolveModel(config.model_profile, 'fuckit:verifier'),
    },

    // Phase info
    phase: {
      found: !!phaseDir,
      dir: phaseDir,
      number: phase,
    },

    // File existence
    files: {
      state_exists: pathExists(path.join(cwd, '.planning', 'STATE.md')),
      config_exists: pathExists(path.join(cwd, '.planning', 'config.json')),
      roadmap_exists: pathExists(path.join(cwd, '.planning', 'ROADMAP.md')),
    },
  };

  // Include file contents if requested (v1.15.0 optimization)
  if (includes.has('state')) {
    result.state_content = safeRead(path.join(cwd, '.planning', 'STATE.md'));
  }
  if (includes.has('config')) {
    result.config_content = safeRead(path.join(cwd, '.planning', 'config.json'));
  }
  if (includes.has('roadmap')) {
    result.roadmap_content = safeRead(path.join(cwd, '.planning', 'ROADMAP.md'));
  }
  if (includes.has('requirements')) {
    result.requirements_content = safeRead(path.join(cwd, '.planning', 'REQUIREMENTS.md'));
  }
  if (includes.has('context') && phaseDir) {
    result.context_content = safeRead(path.join(phaseDir, 'CONTEXT.md'));
  }
  if (includes.has('research') && phaseDir) {
    result.research_content = safeRead(path.join(phaseDir, 'RESEARCH.md'));
  }

  console.log(JSON.stringify(result, null, 2));
}

function cmdInitPlanPhase(cwd, phase, includes) {
  if (!phase) {
    console.error('ERROR: phase required for init plan-phase');
    process.exit(1);
  }

  const config = loadConfig(cwd);
  const phaseDir = findPhaseDir(cwd, phase);

  const result = {
    // Config values
    config: {
      model_profile: config.model_profile,
      commit_docs: config.commit_docs,
      research: config.research,
      plan_checker: config.plan_checker,
    },

    // Models
    models: {
      researcher: resolveModel(config.model_profile, 'fuckit:phase-researcher'),
      planner: resolveModel(config.model_profile, 'fuckit:planner'),
      checker: resolveModel(config.model_profile, 'fuckit:plan-checker'),
    },

    // Phase info
    phase: {
      found: !!phaseDir,
      dir: phaseDir,
      number: phase,
    },

    // File existence
    files: {
      state_exists: pathExists(path.join(cwd, '.planning', 'STATE.md')),
      config_exists: pathExists(path.join(cwd, '.planning', 'config.json')),
      roadmap_exists: pathExists(path.join(cwd, '.planning', 'ROADMAP.md')),
      requirements_exists: pathExists(path.join(cwd, '.planning', 'REQUIREMENTS.md')),
    },
  };

  // Include file contents if requested
  if (includes.has('state')) {
    result.state_content = safeRead(path.join(cwd, '.planning', 'STATE.md'));
  }
  if (includes.has('config')) {
    result.config_content = safeRead(path.join(cwd, '.planning', 'config.json'));
  }
  if (includes.has('roadmap')) {
    result.roadmap_content = safeRead(path.join(cwd, '.planning', 'ROADMAP.md'));
  }
  if (includes.has('requirements')) {
    result.requirements_content = safeRead(path.join(cwd, '.planning', 'REQUIREMENTS.md'));
  }
  if (includes.has('context') && phaseDir) {
    result.context_content = safeRead(path.join(phaseDir, 'CONTEXT.md'));
  }
  if (includes.has('research') && phaseDir) {
    result.research_content = safeRead(path.join(phaseDir, 'RESEARCH.md'));
  }
  if (includes.has('verification') && phaseDir) {
    result.verification_content = safeRead(path.join(phaseDir, 'VERIFICATION.md'));
  }
  if (includes.has('uat') && phaseDir) {
    result.uat_content = safeRead(path.join(phaseDir, 'UAT.md'));
  }

  console.log(JSON.stringify(result, null, 2));
}

function cmdPhaseIndex(cwd, phase) {
  if (!phase) {
    console.error('ERROR: phase required for phase-index');
    process.exit(1);
  }

  const phaseDir = findPhaseDir(cwd, phase);

  if (!phaseDir) {
    console.log(JSON.stringify({ error: 'Phase directory not found', phase }, null, 2));
    return;
  }

  try {
    const files = fs.readdirSync(phaseDir);
    const planFiles = files.filter(f => f.match(/-PLAN\.md$/i));

    const plans = planFiles.map(filename => {
      const planPath = path.join(phaseDir, filename);
      const frontmatter = extractFrontmatter(planPath);
      const summaryPath = planPath.replace(/PLAN\.md$/i, 'SUMMARY.md');
      const hasSummary = pathExists(summaryPath);

      // Extract plan ID from filename (e.g., "03-01" from "03-01-PLAN.md")
      const planId = filename.replace(/-PLAN\.md$/i, '');

      return {
        id: planId,
        filename,
        path: planPath,
        wave: frontmatter.wave || 1,
        autonomous: frontmatter.autonomous !== false,
        type: frontmatter.type || 'execute',
        depends_on: frontmatter.depends_on || [],
        files_modified: frontmatter.files_modified || [],
        completed: hasSummary,
        summary_path: hasSummary ? summaryPath : null,
      };
    });

    // Group by wave
    const waves = {};
    plans.forEach(plan => {
      const wave = plan.wave;
      if (!waves[wave]) waves[wave] = [];
      waves[wave].push(plan.id);
    });

    const result = {
      phase: phase,
      phase_dir: phaseDir,
      plan_count: plans.length,
      plans,
      waves,
      incomplete: plans.filter(p => !p.completed).map(p => p.id),
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR reading phase directory:', err.message);
    process.exit(1);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function parseIncludeFlag(args) {
  const includeArg = args.find(a => a.startsWith('--include='));
  if (!includeArg) return new Set();

  const value = includeArg.split('=')[1];
  if (!value) return new Set();

  return new Set(value.split(',').map(s => s.trim()));
}

function main() {
  const cwd = process.cwd();
  const [,, command, subcommand, ...args] = process.argv;

  const includes = parseIncludeFlag([subcommand, ...args]);
  const cleanArgs = [subcommand, ...args].filter(a => !a.startsWith('--include='));

  if (command === 'init') {
    const workflow = cleanArgs[0];
    const phase = cleanArgs[1];

    switch (workflow) {
      case 'execute-phase':
        cmdInitExecutePhase(cwd, phase, includes);
        break;
      case 'plan-phase':
        cmdInitPlanPhase(cwd, phase, includes);
        break;
      default:
        console.error(`ERROR: Unknown workflow: ${workflow}`);
        console.error('Available: execute-phase, plan-phase');
        process.exit(1);
    }
  } else if (command === 'phase-index') {
    cmdPhaseIndex(cwd, cleanArgs[0]);
  } else {
    console.error(`ERROR: Unknown command: ${command}`);
    console.error('Available: init, phase-index');
    process.exit(1);
  }
}

main();
