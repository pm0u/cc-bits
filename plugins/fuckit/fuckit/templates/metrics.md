# Metrics Template

Template for `.planning/metrics.json` — local project analytics.

---

## File Template

```json
{
  "version": "1.0",
  "created": "YYYY-MM-DDTHH:MM:SSZ",
  "updated": "YYYY-MM-DDTHH:MM:SSZ",

  "execution": {
    "phases_completed": 0,
    "plans_completed": 0,
    "tasks_completed": 0,
    "total_commits": 0,
    "total_duration_ms": 0
  },

  "verification": {
    "runs": 0,
    "passed": 0,
    "gaps_found": 0,
    "human_needed": 0,
    "pass_rate": 0.0
  },

  "failures": {
    "total": 0,
    "circuit_breaker_triggers": 0,
    "undos": 0
  },

  "gaps": {
    "total_identified": 0,
    "total_closed": 0,
    "common_types": {}
  },

  "by_phase": {},

  "recent_activity": []
}
```

## Field Definitions

### execution

| Field | Type | Description |
|-------|------|-------------|
| phases_completed | int | Total phases finished |
| plans_completed | int | Total plans executed |
| tasks_completed | int | Total tasks committed |
| total_commits | int | Git commits created |
| total_duration_ms | int | Cumulative execution time |

### verification

| Field | Type | Description |
|-------|------|-------------|
| runs | int | Times verifier was run |
| passed | int | Verifications that passed |
| gaps_found | int | Verifications with gaps |
| human_needed | int | Verifications needing human |
| pass_rate | float | passed / runs (0.0 - 1.0) |

### failures

| Field | Type | Description |
|-------|------|-------------|
| total | int | Total failed plan executions |
| circuit_breaker_triggers | int | Times circuit breaker activated |
| undos | int | Plans rolled back |

### gaps

| Field | Type | Description |
|-------|------|-------------|
| total_identified | int | All gaps found by verifier |
| total_closed | int | Gaps fixed by gap-closure plans |
| common_types | object | `{ "type": count }` tracking patterns |

**Common gap types:**
- `unwired_components` - Components not connected
- `stub_implementations` - Placeholder code
- `missing_error_handling` - No try/catch
- `missing_tests` - No test coverage
- `incomplete_api` - Partial endpoints

### by_phase

Per-phase breakdown:

```json
{
  "by_phase": {
    "01-foundation": {
      "plans": 3,
      "tasks": 8,
      "duration_ms": 450000,
      "verification_status": "passed",
      "gaps_found": 0,
      "gaps_closed": 0
    },
    "02-auth": {
      "plans": 4,
      "tasks": 12,
      "duration_ms": 680000,
      "verification_status": "passed",
      "gaps_found": 2,
      "gaps_closed": 2
    }
  }
}
```

### recent_activity

Rolling log of last 20 activities:

```json
{
  "recent_activity": [
    {
      "timestamp": "2024-01-15T14:30:00Z",
      "type": "plan_complete",
      "phase": "03",
      "plan": "02",
      "duration_ms": 120000,
      "tasks": 3
    },
    {
      "timestamp": "2024-01-15T14:00:00Z",
      "type": "verification",
      "phase": "03",
      "status": "gaps_found",
      "gaps": 2
    }
  ]
}
```

## Collection Points

### After plan execution (fuckit:executor)

```javascript
// Update metrics after each plan completes
const metrics = JSON.parse(fs.readFileSync('.planning/metrics.json'));

metrics.execution.plans_completed++;
metrics.execution.tasks_completed += taskCount;
metrics.execution.total_commits += commitCount;
metrics.execution.total_duration_ms += durationMs;

// Update by_phase
const phaseKey = `${phase}-${phaseName}`;
metrics.by_phase[phaseKey] = metrics.by_phase[phaseKey] || {};
metrics.by_phase[phaseKey].plans = (metrics.by_phase[phaseKey].plans || 0) + 1;
metrics.by_phase[phaseKey].tasks = (metrics.by_phase[phaseKey].tasks || 0) + taskCount;
metrics.by_phase[phaseKey].duration_ms = (metrics.by_phase[phaseKey].duration_ms || 0) + durationMs;

// Add to recent_activity
metrics.recent_activity.unshift({
  timestamp: new Date().toISOString(),
  type: 'plan_complete',
  phase: phase,
  plan: plan,
  duration_ms: durationMs,
  tasks: taskCount
});

// Keep only last 20
metrics.recent_activity = metrics.recent_activity.slice(0, 20);

metrics.updated = new Date().toISOString();
fs.writeFileSync('.planning/metrics.json', JSON.stringify(metrics, null, 2));
```

### After verification (fuckit:verifier)

```javascript
metrics.verification.runs++;
if (status === 'passed') metrics.verification.passed++;
if (status === 'gaps_found') metrics.verification.gaps_found++;
if (status === 'human_needed') metrics.verification.human_needed++;
metrics.verification.pass_rate = metrics.verification.passed / metrics.verification.runs;

// Track gap types
for (const gap of gaps) {
  const gapType = classifyGap(gap);
  metrics.gaps.common_types[gapType] = (metrics.gaps.common_types[gapType] || 0) + 1;
  metrics.gaps.total_identified++;
}
```

### After failure (execute-phase)

```javascript
metrics.failures.total++;
if (circuitBreakerTriggered) {
  metrics.failures.circuit_breaker_triggers++;
}
```

### After undo (/fuckit:undo)

```javascript
metrics.failures.undos++;
```

## Initialization

Created during `/fuckit:new-project` with empty values.

```bash
# Check if metrics enabled in config
METRICS_ENABLED=$(cat .planning/config.json 2>/dev/null | grep -o '"metrics"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

if [ "$METRICS_ENABLED" = "true" ] && [ ! -f .planning/metrics.json ]; then
  # Create initial metrics file
  cat > .planning/metrics.json << 'EOF'
{
  "version": "1.0",
  "created": "$(date -Iseconds)",
  "updated": "$(date -Iseconds)",
  "execution": { "phases_completed": 0, "plans_completed": 0, "tasks_completed": 0, "total_commits": 0, "total_duration_ms": 0 },
  "verification": { "runs": 0, "passed": 0, "gaps_found": 0, "human_needed": 0, "pass_rate": 0.0 },
  "failures": { "total": 0, "circuit_breaker_triggers": 0, "undos": 0 },
  "gaps": { "total_identified": 0, "total_closed": 0, "common_types": {} },
  "by_phase": {},
  "recent_activity": []
}
EOF
fi
```

## Config Options

In `.planning/config.json`:

```json
{
  "metrics": true,
  "metrics_options": {
    "track_duration": true,
    "track_gaps": true,
    "activity_limit": 20
  }
}
```

Set `"metrics": false` to disable metrics collection entirely.

## Viewing Metrics

Use `/fuckit:progress` which reads metrics.json and displays:

```
## Project Metrics

**Execution:**
- Plans: 12 completed
- Tasks: 36 committed
- Duration: 4.2 hours total

**Verification:**
- Pass rate: 75% (9/12)
- Common gaps: unwired_components (4), stub_implementations (2)

**Health:**
- Failures: 3 total
- Circuit breakers: 1
- Undos: 0
```
