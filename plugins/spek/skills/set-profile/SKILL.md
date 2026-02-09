---
name: spek:set-profile
description: Switch model profile for SPEK agents (quality/balanced/budget)
arguments:
  - name: profile
    description: "Profile name: quality, balanced, or budget"
    required: true
---

<objective>
Switch the model profile used by SPEK agents. This controls which Claude model each agent uses, balancing quality vs token spend.
</objective>

<profiles>
| Profile | Description |
|---------|-------------|
| **quality** | Opus everywhere except read-only verification |
| **balanced** | Opus for planning, Sonnet for execution/verification (default) |
| **budget** | Sonnet for writing, Haiku for research/verification |
</profiles>

<process>

## 1. Validate argument

```
if $ARGUMENTS.profile not in ["quality", "balanced", "budget"]:
  Error: Invalid profile "$ARGUMENTS.profile"
  Valid profiles: quality, balanced, budget
  STOP
```

## 2. Check for project

```bash
ls .planning/config.json 2>/dev/null
```

If no `.planning/` directory:
```
Error: No SPEK project found.
Run /spek:new-project first to initialize a project.
```

## 3. Update config.json

Read current config:
```bash
cat .planning/config.json
```

Update `model_profile` field (or add if missing):
```json
{
  "model_profile": "$ARGUMENTS.profile"
}
```

Write updated config back to `.planning/config.json`.

## 4. Confirm

```
✓ Model profile set to: $ARGUMENTS.profile

Agents will now use:
[Show table from model-profiles.md for selected profile]

Next spawned agents will use the new profile.
```

</process>

<examples>

**Switch to budget mode:**
```
/spek:set-profile budget

✓ Model profile set to: budget

Agents will now use:
| Agent | Model |
|-------|-------|
| spek:planner | sonnet |
| spek:executor | sonnet |
| spek:verifier | haiku |
| ... | ... |
```

**Switch to quality mode:**
```
/spek:set-profile quality

✓ Model profile set to: quality

Agents will now use:
| Agent | Model |
|-------|-------|
| spek:planner | opus |
| spek:executor | opus |
| spek:verifier | sonnet |
| ... | ... |
```

</examples>
