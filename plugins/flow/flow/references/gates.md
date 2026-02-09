# Flow Gates

Gates are explicit control points where the user decides what happens next. Inspired by FUCKIT's pattern of giving users control at each transition.

## Philosophy

**Guided, not automatic.**

Flow presents options at key decision points. The user drives the workflow, Flow doesn't make assumptions about what to do next.

## Gate Types

### 1. Post-Discussion Gate

**When:** After `/flow:discuss` completes and SPEC.md is created

**Purpose:** User decides whether to proceed to planning or refine the spec further

**Presentation:**
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPEC READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spec:** specs/{feature}/SPEC.md
**Status:** ACTIVE
**Ready gate:** ✓ PASSED

{Summary of requirements and acceptance criteria}

───────────────────────────────────────────────────────

## ▶ What's Next?
```

**Options:**
1. **Continue** - Proceed to planning (includes research if needed) **(Recommended)**
2. **Discuss more** - Refine the spec further
3. **Plan without research** - Skip research, plan directly

**Routing:**
- **Continue** → `/flow:plan` with auto-research enabled
- **Discuss more** → Re-enter discussion mode, refine SPEC.md
- **Plan without research** → `/flow:plan` with `skip_research=true`

**Auto-decision (configurable):**
- If spec is simple (≤3 acceptance criteria) → auto-select "Continue"
- Otherwise → always present gate

### 2. Post-Planning Gate

**When:** After `/flow:plan` completes and PLAN.md is created

**Purpose:** User reviews plan before committing to execution

**Presentation:**
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PLAN READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Plan:** specs/{feature}/PLAN.md
**Tasks:** {N} tasks
**Verification:** ✓ PASSED
**Research:** {Completed | Used existing | Skipped}

{Task summary - first few tasks with brief descriptions}

───────────────────────────────────────────────────────

## ▶ What's Next?
```

**Options:**
1. **Execute now** - Run all tasks **(Recommended)**
2. **Review plan** - Show me the full PLAN.md first
3. **Adjust approach** - Return to spec or re-plan

**Routing:**
- **Execute now** → `/flow:execute`
- **Review plan** → Display full PLAN.md, then re-present this gate
- **Adjust approach** → Return to post-discussion gate

**Auto-decision:**
- Never auto-execute (always present this gate)
- Execution is the "point of no return" - always require explicit approval

### 3. Mid-Execution Gate (Task Completion)

**When:** After each task completes during execution

**Purpose:** User can pause, review, or continue

**Presentation:**
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► TASK COMPLETE ({N}/{Total})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Completed:** {Task N name}
**Status:** ✓ DONE
**Commit:** {commit hash} {commit message}

{Brief summary of what was done}

───────────────────────────────────────────────────────

## ▶ What's Next?
```

**Options:**
1. **Continue** - Execute next task **(Recommended)**
2. **Review changes** - Show diff before continuing
3. **Pause** - Stop execution, I'll resume later

**Routing:**
- **Continue** → Execute next task
- **Review changes** → Show git diff, then re-present gate
- **Pause** → Save progress, exit execution

**Auto-decision (configurable):**
- By default → auto-continue (don't stop after each task)
- User can enable "pause after each task" mode for careful review

### 4. Post-Execution Gate

**When:** After all tasks in `/flow:execute` complete

**Purpose:** User decides whether to verify or continue working

**Presentation:**
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► EXECUTION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Tasks completed:** {N}/{N}
**Tests:** {Passed | Failed | Not run}
**Commits:** {N} commits

{Summary of what was built}

───────────────────────────────────────────────────────

## ▶ What's Next?
```

**Options:**
1. **Verify** - Run verification to ensure spec is satisfied **(Recommended)**
2. **Fix issues** - Tests failed or problems found
3. **Done** - Mark as complete without verification

**Routing:**
- **Verify** → `/flow:verify`
- **Fix issues** → Offer to continue execution or manual fix
- **Done** → Mark SPEC.md as IMPLEMENTED, exit

**Auto-decision:**
- If tests passed → offer "Verify (recommended)"
- If tests failed → offer "Fix issues (required)"

## Gate Configuration

User can configure gate behavior in `.flow/config.json`:

```json
{
  "gates": {
    "post_discussion": "always",        // "always" | "auto" | "never"
    "post_planning": "always",          // Always show (can't disable)
    "mid_execution": "auto",            // "always" | "auto" | "never"
    "post_execution": "always"          // "always" | "auto" | "never"
  }
}
```

**Values:**
- `"always"` - Always present the gate
- `"auto"` - Present gate for complex work, skip for simple work
- `"never"` - Skip gate, proceed automatically

**Restrictions:**
- `post_planning` cannot be `"never"` - execution requires approval
- `post_execution` recommended to stay `"always"`

## Special Gates

### Split Detection Gate

**When:** During discussion or planning, system detects spec is too large

**Purpose:** Offer to split into hierarchical specs

**Presentation:**
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPLIT RECOMMENDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This spec is complex enough to benefit from splitting.

**Detected signals:**
- {N} requirements spanning multiple domains
- {N} acceptance criteria
- Multiple distinct concerns identified

**Suggested split:**
specs/{feature}/SPEC.md (parent)
  - {feature}/session/SPEC.md - Session management
  - {feature}/api/SPEC.md - API endpoints
  - {feature}/ui/SPEC.md - User interface

───────────────────────────────────────────────────────

## ▶ How to proceed?
```

**Options:**
1. **Split into sub-specs** - Create hierarchical structure **(Recommended)**
2. **Continue as one spec** - I'll manage the complexity

**Routing:**
- **Split** → Create parent + children, discuss each child
- **Continue** → Proceed with single spec (may get KICKBACK from planner)

### Cascade Update Gate

**When:** Parent SPEC.md is updated and children may be affected

**Purpose:** Offer to propagate changes to children

**Presentation:**
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PARENT SPEC UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Updated:** specs/auth/SPEC.md

**Changes detected:**
- Token expiry: 24 hours → 1 hour
- Added: Rate limiting requirement

**Affected children:**
- session/ - Token expiry mentioned
- api/ - Rate limiting implementation
- ui/ ⚠️ - May need session timeout UI

───────────────────────────────────────────────────────

## ▶ Update children?
```

**Options:**
1. **Update all** - Propagate changes to all children **(Recommended)**
2. **Review each** - Let me approve each child update
3. **Skip** - I'll update manually

**Routing:**
- **Update all** → Automatically update all children, show summary
- **Review each** → Show proposed changes for each, ask approval
- **Skip** → Exit, children not updated

## Gate Best Practices

### When to Auto-Skip
- Simple, single-file changes
- Trivial features (add button, fix typo)
- User in "flow state" - don't interrupt

### When to Always Show
- Before execution (point of no return)
- After complex discussions (ensure alignment)
- When errors or failures occur (user must decide)

### Clear Option Wording
- ✅ "Continue" not "Proceed" or "Go"
- ✅ "Discuss more" not "Go back" or "Revise"
- ✅ "Execute now" not "Start" or "Begin"
- ✅ Make recommended option clear with "(Recommended)"

### Progressive Disclosure
- Show summary, not full details
- Offer "Review plan" option to see more
- Keep gate presentation clean and scannable

## Error Handling at Gates

If an error occurs before reaching a gate:
1. Present the error clearly
2. Offer recovery options:
   - Fix and retry
   - Adjust approach
   - Abandon
3. Never fail silently

Example:
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PLANNING FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The planner encountered an issue:

**Error:** Circular dependency detected
- auth/session depends on auth/api
- auth/api depends on auth/session

───────────────────────────────────────────────────────

## ▶ How to fix?
```

Options:
1. **Adjust spec** - Remove circular dependency
2. **Review dependencies** - Show me the dependency graph
3. **Abort** - Stop planning

Never proceed automatically after errors.
