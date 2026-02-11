#!/usr/bin/env node

/**
 * FUCKIT Tools — CLI utility for FUCKIT workflow operations
 *
 * Based on GSD v1.15.0 optimization pattern: read files once, not twice.
 * Based on GSD v1.16.0 delegation pattern: CLI handles mechanical operations.
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
 *
 *   phase-index <phase>
 *     Returns index of all plans in a phase with metadata
 *
 *   phase add <description>
 *     Add phase to end of current milestone
 *     Example: phase add "Add authentication system"
 *
 *   phase remove <phase-number>
 *     Remove future phase and renumber subsequent phases
 *     Example: phase remove 17
 *
 *   phase insert <after-phase> <description>
 *     Insert decimal phase after specified phase
 *     Example: phase insert 72 "Fix critical auth bug"
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

// ─── Phase Management Helpers ─────────────────────────────────────────────────

function generateSlug(description) {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseRoadmap(content) {
  const lines = content.split('\n');
  const phases = [];
  let currentMilestone = null;
  let currentMilestoneStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find current milestone
    if (line.match(/^## Current Milestone:/)) {
      currentMilestone = line.replace(/^## Current Milestone:\s*/, '').trim();
      currentMilestoneStart = i;
    }

    // Find phase headings
    const phaseMatch = line.match(/^### Phase ([\d.]+):\s*(.+?)(\s*\(INSERTED\))?$/);
    if (phaseMatch) {
      const phaseNum = phaseMatch[1];
      const phaseName = phaseMatch[2].trim();
      const isInserted = !!phaseMatch[3];
      const isInteger = !phaseNum.includes('.');

      phases.push({
        number: phaseNum,
        name: phaseName,
        line: i,
        isInteger,
        isInserted,
        inCurrentMilestone: currentMilestoneStart > -1 && i > currentMilestoneStart
      });
    }

    // Check for milestone separator or next milestone
    if (currentMilestoneStart > -1 && (line.match(/^---$/) || line.match(/^## (Completed|Future) Milestone/))) {
      // End of current milestone
      currentMilestoneStart = -1;
    }
  }

  return { phases, currentMilestone, lines };
}

function findPhaseInRoadmap(parsed, phaseNum) {
  return parsed.phases.find(p => p.number === String(phaseNum));
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

function cmdPhaseAdd(cwd, description) {
  if (!description) {
    console.error('ERROR: Phase description required');
    console.error('Usage: fuckit-tools phase add <description>');
    process.exit(1);
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');

  if (!pathExists(roadmapPath)) {
    console.error('ERROR: ROADMAP.md not found');
    process.exit(1);
  }

  const roadmapContent = safeRead(roadmapPath);
  const parsed = parseRoadmap(roadmapContent);

  if (!parsed.currentMilestone) {
    console.error('ERROR: No current milestone found in roadmap');
    process.exit(1);
  }

  // Find highest integer phase in current milestone
  const currentMilestonePhases = parsed.phases.filter(p => p.inCurrentMilestone && p.isInteger);
  const maxPhase = Math.max(0, ...currentMilestonePhases.map(p => parseInt(p.number, 10)));
  const nextPhase = maxPhase + 1;
  const phaseNumStr = String(nextPhase).padStart(2, '0');

  // Generate slug and directory name
  const slug = generateSlug(description);
  const dirName = `${phaseNumStr}-${slug}`;
  const phaseDir = path.join(cwd, '.planning', 'phases', dirName);

  // Create phase directory
  try {
    fs.mkdirSync(phaseDir, { recursive: true });
  } catch (err) {
    console.error(`ERROR: Failed to create directory: ${err.message}`);
    process.exit(1);
  }

  // Find insertion point in roadmap (after last phase in current milestone)
  const lastPhase = currentMilestonePhases[currentMilestonePhases.length - 1];
  let insertionLine = lastPhase ? lastPhase.line + 1 : -1;

  // Skip to end of last phase section
  if (insertionLine > -1) {
    for (let i = insertionLine; i < parsed.lines.length; i++) {
      if (parsed.lines[i].match(/^### Phase/) || parsed.lines[i].match(/^---$/)) {
        insertionLine = i;
        break;
      }
      insertionLine = i + 1;
    }
  }

  // Build new phase section
  const phaseSection = [
    '',
    `### Phase ${nextPhase}: ${description}`,
    '',
    '**Goal:** [To be planned]',
    `**Depends on:** Phase ${maxPhase}`,
    '**Plans:** 0 plans',
    '',
    'Plans:',
    `- [ ] TBD (run /fuckit:plan-phase ${nextPhase} to break down)`,
    '',
    '**Details:**',
    '[To be added during planning]',
    ''
  ];

  // Insert into roadmap
  const updatedLines = [
    ...parsed.lines.slice(0, insertionLine),
    ...phaseSection,
    ...parsed.lines.slice(insertionLine)
  ];

  // Write updated roadmap
  fs.writeFileSync(roadmapPath, updatedLines.join('\n'));

  // Update STATE.md if it exists
  if (pathExists(statePath)) {
    let stateContent = safeRead(statePath);

    // Add roadmap evolution note
    if (stateContent.includes('### Roadmap Evolution')) {
      // Insert after the heading
      stateContent = stateContent.replace(
        /### Roadmap Evolution\n/,
        `### Roadmap Evolution\n- Phase ${nextPhase} added: ${description}\n`
      );
    } else if (stateContent.includes('## Accumulated Context')) {
      // Add section if it doesn't exist
      stateContent = stateContent.replace(
        /## Accumulated Context\n/,
        `## Accumulated Context\n\n### Roadmap Evolution\n- Phase ${nextPhase} added: ${description}\n`
      );
    }

    fs.writeFileSync(statePath, stateContent);
  }

  // Return result
  console.log(JSON.stringify({
    success: true,
    phase_number: nextPhase,
    phase_number_str: phaseNumStr,
    description,
    slug,
    directory: phaseDir,
    previous_phase: maxPhase,
  }, null, 2));
}

function cmdPhaseRemove(cwd, phaseNum) {
  if (!phaseNum) {
    console.error('ERROR: Phase number required');
    console.error('Usage: fuckit-tools phase remove <phase-number>');
    process.exit(1);
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');

  if (!pathExists(roadmapPath)) {
    console.error('ERROR: ROADMAP.md not found');
    process.exit(1);
  }

  const roadmapContent = safeRead(roadmapPath);
  const parsed = parseRoadmap(roadmapContent);

  // Find the phase to remove
  const targetPhase = findPhaseInRoadmap(parsed, phaseNum);
  if (!targetPhase) {
    console.error(`ERROR: Phase ${phaseNum} not found in roadmap`);
    process.exit(1);
  }

  // Get current phase from STATE.md
  const stateContent = safeRead(statePath, '');
  const currentPhaseMatch = stateContent.match(/Phase:\s*(\d+)/);
  const currentPhase = currentPhaseMatch ? parseInt(currentPhaseMatch[1], 10) : 0;

  // Validate it's a future phase
  const targetNum = parseFloat(phaseNum);
  if (targetNum <= currentPhase) {
    console.error(`ERROR: Cannot remove Phase ${phaseNum}`);
    console.error(`Current phase: ${currentPhase}, target is not a future phase`);
    process.exit(1);
  }

  // Find phase directory
  const phasesDir = path.join(cwd, '.planning', 'phases');
  let phaseDir = null;

  try {
    const dirs = fs.readdirSync(phasesDir);
    const pattern = targetPhase.isInteger
      ? new RegExp(`^${String(phaseNum).padStart(2, '0')}-`)
      : new RegExp(`^${phaseNum.replace('.', '\\.')}-`);

    const match = dirs.find(d => pattern.test(d));
    if (match) {
      phaseDir = path.join(phasesDir, match);
    }
  } catch (err) {
    // Directory might not exist
  }

  // Check for completed work (SUMMARY.md files)
  if (phaseDir && pathExists(phaseDir)) {
    try {
      const files = fs.readdirSync(phaseDir);
      const summaries = files.filter(f => f.match(/-SUMMARY\.md$/));
      if (summaries.length > 0) {
        console.error(`ERROR: Phase ${phaseNum} has completed work`);
        console.error('Found executed plans:', summaries);
        console.error('Cannot remove phases with completed work');
        process.exit(1);
      }
    } catch (err) {
      // Ignore
    }
  }

  // Determine what needs renumbering
  const renumberOps = [];

  if (targetPhase.isInteger) {
    const targetInt = parseInt(phaseNum, 10);

    // All integer phases > target get decremented
    parsed.phases.filter(p => p.isInteger && parseInt(p.number, 10) > targetInt).forEach(p => {
      const oldNum = parseInt(p.number, 10);
      const newNum = oldNum - 1;
      renumberOps.push({ old: String(oldNum), new: String(newNum), isInteger: true });
    });

    // Decimal phases >= target.0 and < (target+1).0 become (target-1).x
    parsed.phases.filter(p => !p.isInteger).forEach(p => {
      const [base, decimal] = p.number.split('.');
      const baseInt = parseInt(base, 10);

      if (baseInt === targetInt) {
        // Decimals under removed phase (72.1, 72.2) become (71.1, 71.2)
        renumberOps.push({ old: p.number, new: `${targetInt - 1}.${decimal}`, isInteger: false });
      } else if (baseInt > targetInt) {
        // Decimals under higher phases get decremented (73.1 → 72.1)
        renumberOps.push({ old: p.number, new: `${baseInt - 1}.${decimal}`, isInteger: false });
      }
    });
  } else {
    // Removing a decimal phase (e.g., 72.1)
    const [targetBase, targetDecimal] = phaseNum.split('.');
    const targetBaseInt = parseInt(targetBase, 10);
    const targetDecInt = parseInt(targetDecimal, 10);

    // Only decimals in the same series with higher decimal numbers get decremented
    parsed.phases.filter(p => !p.isInteger).forEach(p => {
      const [base, decimal] = p.number.split('.');
      const baseInt = parseInt(base, 10);
      const decInt = parseInt(decimal, 10);

      if (baseInt === targetBaseInt && decInt > targetDecInt) {
        renumberOps.push({ old: p.number, new: `${targetBase}.${decInt - 1}`, isInteger: false });
      }
    });
  }

  // Delete phase directory
  if (phaseDir && pathExists(phaseDir)) {
    fs.rmSync(phaseDir, { recursive: true, force: true });
  }

  // Rename directories (in reverse order to avoid conflicts)
  renumberOps.reverse().forEach(op => {
    const oldPattern = op.isInteger
      ? `^${String(op.old).padStart(2, '0')}-`
      : `^${op.old.replace('.', '\\.')}-`;
    const newPrefix = op.isInteger
      ? String(op.new).padStart(2, '0')
      : op.new;

    try {
      const dirs = fs.readdirSync(phasesDir);
      const match = dirs.find(d => new RegExp(oldPattern).test(d));

      if (match) {
        const oldPath = path.join(phasesDir, match);
        const newName = match.replace(new RegExp(oldPattern), `${newPrefix}-`);
        const newPath = path.join(phasesDir, newName);

        fs.renameSync(oldPath, newPath);

        // Rename plan files inside
        const files = fs.readdirSync(newPath);
        files.forEach(file => {
          const oldFilePattern = new RegExp(`^${op.old.replace('.', '\\.')}-`);
          if (oldFilePattern.test(file)) {
            const newFile = file.replace(oldFilePattern, `${op.new}-`);
            fs.renameSync(
              path.join(newPath, file),
              path.join(newPath, newFile)
            );
          }
        });
      }
    } catch (err) {
      // Directory might not exist
    }
  });

  // Update roadmap: remove phase section and renumber references
  let updatedContent = roadmapContent;

  // Remove phase section
  const phaseHeading = `### Phase ${phaseNum}:`;
  const lines = updatedContent.split('\n');
  const startIdx = lines.findIndex(l => l.startsWith(phaseHeading));

  if (startIdx > -1) {
    let endIdx = startIdx + 1;
    while (endIdx < lines.length && !lines[endIdx].match(/^### Phase|^---$/)) {
      endIdx++;
    }

    lines.splice(startIdx, endIdx - startIdx);
    updatedContent = lines.join('\n');
  }

  // Renumber all references
  renumberOps.forEach(op => {
    const patterns = [
      { old: `### Phase ${op.old}:`, new: `### Phase ${op.new}:` },
      { old: `**Phase ${op.old}:`, new: `**Phase ${op.new}:` },
      { old: `Phase ${op.old}\\b`, new: `Phase ${op.new}` },
      { old: `\\b${op.old}-`, new: `${op.new}-` },
    ];

    patterns.forEach(({ old, new: newStr }) => {
      updatedContent = updatedContent.replace(new RegExp(old, 'g'), newStr);
    });
  });

  fs.writeFileSync(roadmapPath, updatedContent);

  // Update STATE.md: update phase count
  if (pathExists(statePath)) {
    let stateContent = safeRead(statePath);

    // Update phase count if present
    const totalPhases = parsed.phases.length - 1; // -1 for removed phase
    stateContent = stateContent.replace(
      /Phase:\s*(\d+)\s+of\s+(\d+)/,
      (match, current, total) => `Phase: ${current} of ${totalPhases}`
    );

    fs.writeFileSync(statePath, stateContent);
  }

  console.log(JSON.stringify({
    success: true,
    removed_phase: phaseNum,
    removed_phase_name: targetPhase.name,
    removed_directory: phaseDir,
    renumbered_count: renumberOps.length,
    renumbered: renumberOps.map(op => ({ from: op.old, to: op.new })),
  }, null, 2));
}

function cmdPhaseInsert(cwd, afterPhase, description) {
  if (!afterPhase || !description) {
    console.error('ERROR: Both phase number and description required');
    console.error('Usage: fuckit-tools phase insert <after> <description>');
    process.exit(1);
  }

  // Validate afterPhase is an integer
  if (!afterPhase.match(/^\d+$/)) {
    console.error('ERROR: Phase number must be an integer');
    process.exit(1);
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');

  if (!pathExists(roadmapPath)) {
    console.error('ERROR: ROADMAP.md not found');
    process.exit(1);
  }

  const roadmapContent = safeRead(roadmapPath);
  const parsed = parseRoadmap(roadmapContent);

  // Find target phase
  const targetPhase = findPhaseInRoadmap(parsed, afterPhase);
  if (!targetPhase) {
    console.error(`ERROR: Phase ${afterPhase} not found in roadmap`);
    process.exit(1);
  }

  if (!targetPhase.isInteger) {
    console.error('ERROR: Can only insert after integer phases');
    process.exit(1);
  }

  // Find existing decimals after this phase
  const targetInt = parseInt(afterPhase, 10);
  const existingDecimals = parsed.phases
    .filter(p => !p.isInteger)
    .filter(p => {
      const [base] = p.number.split('.');
      return parseInt(base, 10) === targetInt;
    })
    .map(p => {
      const [, decimal] = p.number.split('.');
      return parseInt(decimal, 10);
    });

  const maxDecimal = existingDecimals.length > 0 ? Math.max(...existingDecimals) : 0;
  const nextDecimal = maxDecimal + 1;
  const decimalPhase = `${afterPhase}.${nextDecimal}`;

  // Generate slug and directory
  const slug = generateSlug(description);
  const phaseNumPadded = String(afterPhase).padStart(2, '0');
  const dirName = `${phaseNumPadded}.${nextDecimal}-${slug}`;
  const phaseDir = path.join(cwd, '.planning', 'phases', dirName);

  // Create directory
  try {
    fs.mkdirSync(phaseDir, { recursive: true });
  } catch (err) {
    console.error(`ERROR: Failed to create directory: ${err.message}`);
    process.exit(1);
  }

  // Build phase section
  const phaseSection = [
    '',
    `### Phase ${decimalPhase}: ${description} (INSERTED)`,
    '',
    '**Goal:** [Urgent work - to be planned]',
    `**Depends on:** Phase ${afterPhase}`,
    '**Plans:** 0 plans',
    '',
    'Plans:',
    `- [ ] TBD (run /fuckit:plan-phase ${decimalPhase} to break down)`,
    '',
    '**Details:**',
    '[To be added during planning]',
    ''
  ];

  // Find insertion point (after target phase section, before next phase)
  const targetLine = targetPhase.line;
  let insertionLine = targetLine + 1;

  for (let i = insertionLine; i < parsed.lines.length; i++) {
    if (parsed.lines[i].match(/^### Phase/)) {
      insertionLine = i;
      break;
    }
    insertionLine = i + 1;
  }

  // Insert into roadmap
  const updatedLines = [
    ...parsed.lines.slice(0, insertionLine),
    ...phaseSection,
    ...parsed.lines.slice(insertionLine)
  ];

  fs.writeFileSync(roadmapPath, updatedLines.join('\n'));

  // Update STATE.md
  if (pathExists(statePath)) {
    let stateContent = safeRead(statePath);

    // Add roadmap evolution note
    if (stateContent.includes('### Roadmap Evolution')) {
      stateContent = stateContent.replace(
        /### Roadmap Evolution\n/,
        `### Roadmap Evolution\n- Phase ${decimalPhase} inserted after Phase ${afterPhase}: ${description} (URGENT)\n`
      );
    } else if (stateContent.includes('## Accumulated Context')) {
      stateContent = stateContent.replace(
        /## Accumulated Context\n/,
        `## Accumulated Context\n\n### Roadmap Evolution\n- Phase ${decimalPhase} inserted after Phase ${afterPhase}: ${description} (URGENT)\n`
      );
    }

    fs.writeFileSync(statePath, stateContent);
  }

  console.log(JSON.stringify({
    success: true,
    phase_number: decimalPhase,
    description,
    slug,
    directory: phaseDir,
    after_phase: afterPhase,
    decimal_number: nextDecimal,
  }, null, 2));
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
  } else if (command === 'phase') {
    const operation = cleanArgs[0];

    switch (operation) {
      case 'add':
        cmdPhaseAdd(cwd, cleanArgs.slice(1).join(' '));
        break;
      case 'remove':
        cmdPhaseRemove(cwd, cleanArgs[1]);
        break;
      case 'insert': {
        const afterPhase = cleanArgs[1];
        const description = cleanArgs.slice(2).join(' ');
        cmdPhaseInsert(cwd, afterPhase, description);
        break;
      }
      default:
        console.error(`ERROR: Unknown phase operation: ${operation}`);
        console.error('Available: add, remove, insert');
        process.exit(1);
    }
  } else {
    console.error(`ERROR: Unknown command: ${command}`);
    console.error('Available: init, phase-index, phase');
    process.exit(1);
  }
}

main();
