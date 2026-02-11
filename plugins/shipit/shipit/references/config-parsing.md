# Config Parsing

Reliable patterns for reading `.planning/config.json` values.

<problem>
The old grep/sed approach is fragile:
```bash
# BAD - breaks with whitespace, quotes, nested objects
grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"'
```

This fails when:
- JSON has different formatting
- Values contain special characters
- Config structure changes
</problem>

<solution>
Use Node.js for JSON parsing. Node is available in most development environments.
</solution>

<patterns>

## Read String Value

```bash
# Read model_profile from config
MODEL_PROFILE=$(node -e "
  const fs = require('fs');
  try {
    const c = JSON.parse(fs.readFileSync('.planning/config.json'));
    console.log(c.model_profile || 'balanced');
  } catch { console.log('balanced'); }
" 2>/dev/null)
```

## Read Boolean Value

```bash
# Read commit_docs (boolean)
COMMIT_DOCS=$(node -e "
  const fs = require('fs');
  try {
    const c = JSON.parse(fs.readFileSync('.planning/config.json'));
    console.log(c.planning?.commit_docs !== false ? 'true' : 'false');
  } catch { console.log('true'); }
" 2>/dev/null)
```

## Read Nested Value

```bash
# Read parallelization.enabled
PARALLEL=$(node -e "
  const fs = require('fs');
  try {
    const c = JSON.parse(fs.readFileSync('.planning/config.json'));
    console.log(c.parallelization?.enabled !== false ? 'true' : 'false');
  } catch { console.log('true'); }
" 2>/dev/null)
```

## Read with Default

```bash
# Generic pattern with default
read_config() {
  local path="$1"  # e.g., "workflow.verifier"
  local default="$2"

  node -e "
    const fs = require('fs');
    try {
      const c = JSON.parse(fs.readFileSync('.planning/config.json'));
      const path = '$path'.split('.');
      let v = c;
      for (const p of path) { v = v?.[p]; }
      console.log(v ?? '$default');
    } catch { console.log('$default'); }
  " 2>/dev/null
}

# Usage
MODEL=$(read_config "model_profile" "balanced")
VERIFY=$(read_config "workflow.verifier" "true")
```

## Read Multiple Values

```bash
# Read multiple values in one call (efficient)
eval $(node -e "
  const fs = require('fs');
  try {
    const c = JSON.parse(fs.readFileSync('.planning/config.json'));
    console.log('MODEL_PROFILE=' + (c.model_profile || 'balanced'));
    console.log('COMMIT_DOCS=' + (c.planning?.commit_docs !== false));
    console.log('PARALLEL=' + (c.parallelization?.enabled !== false));
    console.log('RUN_TESTS=' + (c.verification?.run_tests !== false));
    console.log('METRICS=' + (c.metrics !== false));
  } catch {
    console.log('MODEL_PROFILE=balanced');
    console.log('COMMIT_DOCS=true');
    console.log('PARALLEL=true');
    console.log('RUN_TESTS=true');
    console.log('METRICS=true');
  }
" 2>/dev/null)
```

## Validate Config

```bash
# Check if config.json is valid JSON
if node -e "JSON.parse(require('fs').readFileSync('.planning/config.json'))" 2>/dev/null; then
  echo "Config valid"
else
  echo "Config invalid or missing"
fi
```

## Update Config Value

```bash
# Set a config value
set_config() {
  local key="$1"
  local value="$2"

  node -e "
    const fs = require('fs');
    const path = '.planning/config.json';
    let c = {};
    try { c = JSON.parse(fs.readFileSync(path)); } catch {}
    c['$key'] = '$value' === 'true' ? true : '$value' === 'false' ? false : '$value';
    fs.writeFileSync(path, JSON.stringify(c, null, 2));
  "
}

# Usage
set_config "model_profile" "quality"
set_config "metrics" "false"
```

</patterns>

<fallback_without_node>
If Node.js is not available, use jq:

```bash
# Check for jq
if command -v jq &>/dev/null; then
  MODEL_PROFILE=$(jq -r '.model_profile // "balanced"' .planning/config.json 2>/dev/null)
  COMMIT_DOCS=$(jq -r '.planning.commit_docs // true' .planning/config.json 2>/dev/null)
fi
```

Or Python:

```bash
# Check for Python
if command -v python3 &>/dev/null; then
  MODEL_PROFILE=$(python3 -c "
import json
try:
    c = json.load(open('.planning/config.json'))
    print(c.get('model_profile', 'balanced'))
except: print('balanced')
  " 2>/dev/null)
fi
```
</fallback_without_node>

<migration>
## Migrating Existing Code

Replace grep patterns:

**Before:**
```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

**After:**
```bash
MODEL_PROFILE=$(node -e "
  const fs = require('fs');
  try {
    const c = JSON.parse(fs.readFileSync('.planning/config.json'));
    console.log(c.model_profile || 'balanced');
  } catch { console.log('balanced'); }
" 2>/dev/null)
```

**Benefits:**
- Handles any JSON formatting
- Proper error handling
- Nested path support
- Type-aware (booleans, numbers)
- No regex edge cases
</migration>

<config_schema>
## Expected Config Structure

```json
{
  "mode": "interactive",
  "depth": "standard",
  "model_profile": "balanced",

  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },

  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },

  "parallelization": {
    "enabled": true,
    "max_concurrent_agents": 3,
    "skip_checkpoints": false
  },

  "verification": {
    "run_tests": true
  },

  "metrics": true,

  "gates": {
    "confirm_project": true,
    "confirm_phases": true,
    "confirm_roadmap": true,
    "confirm_breakdown": true,
    "confirm_plan": true
  },

  "safety": {
    "always_confirm_destructive": true,
    "always_confirm_external_services": true
  },

  "git": {
    "branching_strategy": "none",
    "phase_branch_template": "gsd/phase-{phase}-{slug}",
    "milestone_branch_template": "gsd/{milestone}-{slug}"
  }
}
```

All fields are optional. Missing fields use sensible defaults.
</config_schema>
