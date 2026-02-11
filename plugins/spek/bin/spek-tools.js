#!/usr/bin/env node

/**
 * SPEK Tools — CLI utility for SPEK workflow operations
 *
 * Based on GSD v1.15.0 optimization pattern: read files once, not twice.
 * Based on GSD v1.16.0 delegation pattern: CLI handles mechanical operations.
 *
 * Duplicates shared code from fuckit-tools.js for plugin independence.
 *
 * Usage: node spek-tools.js <command> [args]
 *
 * Commands:
 *   state get
 *     Parse STATE.md and return current position as JSON
 *
 *   state update phase <phase-number>
 *     Update current phase in STATE.md
 *
 *   state update plan <status>
 *     Update plan status in STATE.md
 *
 *   state update status <status>
 *     Update overall status in STATE.md
 *
 *   state validate [--repair]
 *     Validate STATE.md against actual artifacts, optionally auto-repair
 *
 *   roadmap parse
 *     Parse ROADMAP.md and return all phases as JSON
 *
 *   roadmap get-phase <phase-number>
 *     Extract specific phase metadata from ROADMAP.md
 *
 *   config validate
 *     Validate config.json structure and return parsed values
 *
 *   spec parse <path>
 *     Parse spec file and return structured JSON
 *
 *   spec extract-name <content>
 *     Generate feature name from spec content
 *
 *   spec detect-split <content>
 *     Analyze if spec should split into hierarchical specs
 *
 *   phase add <description>
 *     Add phase to end of current milestone
 *
 *   phase remove <phase-number>
 *     Remove future phase and renumber subsequent phases
 *
 *   phase insert <after-phase> <description>
 *     Insert decimal phase after specified phase
 */

const fs = require('fs');
const path = require('path');

// ─── Helpers (Duplicated from fuckit-tools.js) ───────────────────────────────

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
    phase_branch_template: 'spek/phase-{phase}-{slug}',
    milestone_branch_template: 'spek/{milestone}-{slug}',
    research: true,
    plan_checker: true,
    verifier: true,
    triangle_validation: true,
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
      triangle_validation: get('triangle_validation', { section: 'spek', field: 'triangle_validation' }) ?? defaults.triangle_validation,
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

// ─── State Operations (SPEK-specific) ─────────────────────────────────────────

function parseState(content) {
  const lines = content.split('\n');
  const result = {
    phase: null,
    plan: null,
    status: null,
    raw: content,
  };

  for (const line of lines) {
    // Extract phase number
    const phaseMatch = line.match(/^Phase:\s*([\d.]+)/);
    if (phaseMatch) {
      result.phase = phaseMatch[1];
    }

    // Extract plan status
    const planMatch = line.match(/^Plan:\s*(.+)$/);
    if (planMatch) {
      result.plan = planMatch[1].trim();
    }

    // Extract overall status
    const statusMatch = line.match(/^Status:\s*(.+)$/);
    if (statusMatch) {
      result.status = statusMatch[1].trim();
    }
  }

  return result;
}

function cmdStateGet(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');

  if (!pathExists(statePath)) {
    console.log(JSON.stringify({ error: 'STATE.md not found' }, null, 2));
    process.exit(1);
  }

  const content = safeRead(statePath);
  const parsed = parseState(content);

  console.log(JSON.stringify(parsed, null, 2));
}

function cmdStateUpdate(cwd, field, value) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');

  if (!pathExists(statePath)) {
    console.error('ERROR: STATE.md not found');
    process.exit(1);
  }

  let content = safeRead(statePath);

  switch (field) {
    case 'phase':
      content = content.replace(/^Phase:\s*.+$/m, `Phase: ${value}`);
      break;
    case 'plan':
      content = content.replace(/^Plan:\s*.+$/m, `Plan: ${value}`);
      break;
    case 'status':
      content = content.replace(/^Status:\s*.+$/m, `Status: ${value}`);
      break;
    default:
      console.error(`ERROR: Unknown field: ${field}`);
      process.exit(1);
  }

  fs.writeFileSync(statePath, content);

  console.log(JSON.stringify({
    success: true,
    field,
    value,
    updated: statePath,
  }, null, 2));
}

function cmdStateValidate(cwd, autoRepair = false) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!pathExists(statePath)) {
    console.log(JSON.stringify({ error: 'STATE.md not found' }, null, 2));
    process.exit(1);
  }

  const stateContent = safeRead(statePath);
  const state = parseState(stateContent);
  const issues = [];

  // Check if phase exists in roadmap
  if (pathExists(roadmapPath)) {
    const roadmapContent = safeRead(roadmapPath);
    const roadmap = parseRoadmap(roadmapContent);
    const phaseExists = findPhaseInRoadmap(roadmap, state.phase);

    if (!phaseExists) {
      issues.push({
        type: 'phase_not_in_roadmap',
        message: `Phase ${state.phase} in STATE.md not found in ROADMAP.md`,
      });
    }
  }

  // Check if phase directory exists
  const phaseDir = findPhaseDir(cwd, state.phase);
  if (!phaseDir) {
    issues.push({
      type: 'phase_dir_missing',
      message: `Phase directory not found for Phase ${state.phase}`,
    });
  } else {
    // Check for uncommitted changes
    try {
      const { execSync } = require('child_process');
      const uncommitted = execSync(`git status --porcelain -- "${phaseDir}" 2>/dev/null || echo ""`, {
        cwd,
        encoding: 'utf-8',
      }).trim();

      if (uncommitted) {
        issues.push({
          type: 'uncommitted_changes',
          message: `Uncommitted changes in phase directory: ${phaseDir}`,
          details: uncommitted,
        });
      }
    } catch (err) {
      // Git not available or other error, skip check
    }

    // Check for completed work vs claimed status
    try {
      const files = fs.readdirSync(phaseDir);
      const summaries = files.filter(f => f.match(/-SUMMARY\.md$/));
      const plans = files.filter(f => f.match(/-PLAN\.md$/));

      if (state.status && state.status.includes('Complete') && summaries.length < plans.length) {
        issues.push({
          type: 'incomplete_phase',
          message: `STATE claims phase complete but ${plans.length - summaries.length} plans lack summaries`,
        });
      }
    } catch (err) {
      // Can't read directory
    }
  }

  const result = {
    valid: issues.length === 0,
    issues,
    state: state,
  };

  if (autoRepair && issues.length > 0) {
    // Auto-repair only safe issues
    result.repairs = [];

    // For now, just report - actual repairs would be implemented based on issue types
    result.message = 'Auto-repair requested but not implemented yet - issues require manual resolution';
  }

  console.log(JSON.stringify(result, null, 2));
}

// ─── Roadmap Operations ───────────────────────────────────────────────────────

function cmdRoadmapParse(cwd) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!pathExists(roadmapPath)) {
    console.log(JSON.stringify({ error: 'ROADMAP.md not found' }, null, 2));
    process.exit(1);
  }

  const content = safeRead(roadmapPath);
  const parsed = parseRoadmap(content);

  console.log(JSON.stringify({
    currentMilestone: parsed.currentMilestone,
    phases: parsed.phases,
    totalPhases: parsed.phases.length,
    integerPhases: parsed.phases.filter(p => p.isInteger).length,
    decimalPhases: parsed.phases.filter(p => !p.isInteger).length,
  }, null, 2));
}

function cmdRoadmapGetPhase(cwd, phaseNum) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!pathExists(roadmapPath)) {
    console.log(JSON.stringify({ error: 'ROADMAP.md not found' }, null, 2));
    process.exit(1);
  }

  const content = safeRead(roadmapPath);
  const parsed = parseRoadmap(content);
  const phase = findPhaseInRoadmap(parsed, phaseNum);

  if (!phase) {
    console.log(JSON.stringify({ error: `Phase ${phaseNum} not found` }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(phase, null, 2));
}

// ─── Config Operations ────────────────────────────────────────────────────────

function cmdConfigValidate(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');

  if (!pathExists(configPath)) {
    console.log(JSON.stringify({ error: 'config.json not found' }, null, 2));
    process.exit(1);
  }

  const config = loadConfig(cwd);

  console.log(JSON.stringify({
    valid: true,
    config,
  }, null, 2));
}

// ─── Spec Operations (SPEK-specific) ──────────────────────────────────────────

function parseSpec(content) {
  const lines = content.split('\n');
  const result = {
    title: null,
    status: null,
    context: {},
    requirements: { must: [], should: [], wont: [] },
    acceptance: [],
    open: [],
    dependencies: [],
    files: [],
    testFiles: [],
  };

  let currentSection = null;
  let currentSubsection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract title (first # heading)
    if (!result.title && line.match(/^# /)) {
      result.title = line.replace(/^# /, '').trim();
      continue;
    }

    // Track sections
    if (line.match(/^## Status/)) {
      currentSection = 'status';
      continue;
    }
    if (line.match(/^## Context/)) {
      currentSection = 'context';
      continue;
    }
    if (line.match(/^## Requirements/)) {
      currentSection = 'requirements';
      continue;
    }
    if (line.match(/^## Acceptance Criteria/)) {
      currentSection = 'acceptance';
      continue;
    }
    if (line.match(/^## OPEN/)) {
      currentSection = 'open';
      continue;
    }
    if (line.match(/^## Dependencies/)) {
      currentSection = 'dependencies';
      continue;
    }
    if (line.match(/^## Files/)) {
      currentSection = 'files';
      continue;
    }
    if (line.match(/^## Test Files/)) {
      currentSection = 'testFiles';
      continue;
    }

    // Track subsections
    if (line.match(/^### /)) {
      currentSubsection = line.replace(/^### /, '').trim();
      continue;
    }

    // Extract status
    if (currentSection === 'status' && !line.match(/^#/)) {
      const statusLine = line.trim();
      if (statusLine && !result.status) {
        result.status = statusLine;
      }
    }

    // Extract requirements
    if (currentSection === 'requirements') {
      if (currentSubsection === 'Must Have' && line.match(/^- \[ \]/)) {
        result.requirements.must.push(line.replace(/^- \[ \] /, '').trim());
      }
      if (currentSubsection === 'Should Have' && line.match(/^- \[ \]/)) {
        result.requirements.should.push(line.replace(/^- \[ \] /, '').trim());
      }
      if (currentSubsection === "Won't Have (this iteration)" && line.match(/^- /)) {
        result.requirements.wont.push(line.replace(/^- /, '').trim());
      }
    }

    // Extract acceptance criteria
    if (currentSection === 'acceptance' && line.match(/^- \[ \]/)) {
      result.acceptance.push(line.replace(/^- \[ \] /, '').trim());
    }

    // Extract OPEN items
    if (currentSection === 'open' && line.match(/^- /)) {
      result.open.push(line.replace(/^- /, '').trim());
    }

    // Extract dependencies
    if (currentSection === 'dependencies' && line.match(/^- /)) {
      result.dependencies.push(line.replace(/^- /, '').trim());
    }

    // Extract files
    if (currentSection === 'files' && line.match(/^- /)) {
      result.files.push(line.replace(/^- /, '').trim());
    }

    // Extract test files
    if (currentSection === 'testFiles' && line.match(/^- /)) {
      result.testFiles.push(line.replace(/^- /, '').trim());
    }
  }

  return result;
}

function cmdSpecParse(cwd, specPath) {
  const fullPath = path.isAbsolute(specPath) ? specPath : path.join(cwd, specPath);

  if (!pathExists(fullPath)) {
    console.log(JSON.stringify({ error: `Spec not found: ${specPath}` }, null, 2));
    process.exit(1);
  }

  const content = safeRead(fullPath);
  const parsed = parseSpec(content);

  console.log(JSON.stringify(parsed, null, 2));
}

function cmdSpecExtractName(content) {
  // Simple heuristic: take first 3 words from content, slugify
  const words = content
    .split('\n')
    .slice(0, 5)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  const name = words.join('-');

  console.log(JSON.stringify({ name }, null, 2));
}

function cmdSpecDetectSplit(content) {
  // Heuristic: detect if content mentions multiple distinct domains
  const lines = content.toLowerCase();
  const domains = {
    api: lines.match(/\b(api|endpoint|rest|graphql|route|controller)\b/g)?.length || 0,
    ui: lines.match(/\b(ui|component|page|view|layout|interface)\b/g)?.length || 0,
    data: lines.match(/\b(database|schema|model|migration|table|query)\b/g)?.length || 0,
    auth: lines.match(/\b(auth|login|permission|role|token|session)\b/g)?.length || 0,
  };

  const activeDomains = Object.entries(domains).filter(([, count]) => count > 2);
  const shouldSplit = activeDomains.length >= 2;

  console.log(JSON.stringify({
    shouldSplit,
    domains: Object.fromEntries(activeDomains),
    suggestion: shouldSplit ? `Consider splitting into: ${activeDomains.map(([d]) => d).join(', ')}` : 'Single spec is appropriate',
  }, null, 2));
}

// ─── Phase Management (Duplicated from fuckit-tools.js) ──────────────────────

function cmdPhaseAdd(cwd, description) {
  if (!description) {
    console.error('ERROR: Phase description required');
    console.error('Usage: spek-tools phase add <description>');
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
    `- [ ] TBD (run /spek:plan-phase ${nextPhase} to break down)`,
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
    console.error('Usage: spek-tools phase remove <phase-number>');
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
    console.error('Usage: spek-tools phase insert <after> <description>');
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
    `- [ ] TBD (run /spek:plan-phase ${decimalPhase} to break down)`,
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

function main() {
  const cwd = process.cwd();
  const [,, command, subcommand, ...args] = process.argv;

  if (command === 'state') {
    switch (subcommand) {
      case 'get':
        cmdStateGet(cwd);
        break;
      case 'update': {
        const field = args[0];
        const value = args.slice(1).join(' ');
        cmdStateUpdate(cwd, field, value);
        break;
      }
      case 'validate':
        const autoRepair = args.includes('--repair');
        cmdStateValidate(cwd, autoRepair);
        break;
      default:
        console.error(`ERROR: Unknown state operation: ${subcommand}`);
        console.error('Available: get, update, validate');
        process.exit(1);
    }
  } else if (command === 'roadmap') {
    switch (subcommand) {
      case 'parse':
        cmdRoadmapParse(cwd);
        break;
      case 'get-phase':
        cmdRoadmapGetPhase(cwd, args[0]);
        break;
      default:
        console.error(`ERROR: Unknown roadmap operation: ${subcommand}`);
        console.error('Available: parse, get-phase');
        process.exit(1);
    }
  } else if (command === 'config') {
    switch (subcommand) {
      case 'validate':
        cmdConfigValidate(cwd);
        break;
      default:
        console.error(`ERROR: Unknown config operation: ${subcommand}`);
        console.error('Available: validate');
        process.exit(1);
    }
  } else if (command === 'spec') {
    switch (subcommand) {
      case 'parse':
        cmdSpecParse(cwd, args[0]);
        break;
      case 'extract-name':
        cmdSpecExtractName(args.join(' '));
        break;
      case 'detect-split':
        cmdSpecDetectSplit(args.join(' '));
        break;
      default:
        console.error(`ERROR: Unknown spec operation: ${subcommand}`);
        console.error('Available: parse, extract-name, detect-split');
        process.exit(1);
    }
  } else if (command === 'phase') {
    switch (subcommand) {
      case 'add':
        cmdPhaseAdd(cwd, args.join(' '));
        break;
      case 'remove':
        cmdPhaseRemove(cwd, args[0]);
        break;
      case 'insert': {
        const afterPhase = args[0];
        const description = args.slice(1).join(' ');
        cmdPhaseInsert(cwd, afterPhase, description);
        break;
      }
      default:
        console.error(`ERROR: Unknown phase operation: ${subcommand}`);
        console.error('Available: add, remove, insert');
        process.exit(1);
    }
  } else {
    console.error(`ERROR: Unknown command: ${command}`);
    console.error('Available: state, roadmap, config, spec, phase');
    process.exit(1);
  }
}

main();
