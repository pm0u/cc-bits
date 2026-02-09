# Planning Workflow

Orchestrates planning phase: optional research → planning → verification → post-planning gate.

## Inputs

- `feature` - Feature path (e.g., "auth" or "auth/session")
- `skip_research` - Skip research phase (optional flag)

## Outputs

- PLAN.md created
- RESEARCH.md created (if research ran)
- Post-planning gate presented

## Process

### 1. Validate Feature

```bash
FEATURE="$1"
SKIP_RESEARCH="${2:-false}"

# Check SPEC.md exists
if [ ! -f "specs/${FEATURE}/SPEC.md" ]; then
  echo "Error: Spec not found: specs/${FEATURE}/SPEC.md"
  echo "Create spec first: /flow:discuss $FEATURE"
  exit 1
fi

# Check status
STATUS=$(grep "^status:" "specs/${FEATURE}/SPEC.md" | awk '{print $2}')

if [ "$STATUS" != "ACTIVE" ]; then
  echo "Warning: Spec status is $STATUS (not ACTIVE)"
  echo "Resolve OPEN items first or proceed anyway at your own risk."
fi
```

### 2. Check Dependencies

```bash
source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh

# Validate dependencies exist and are implemented
echo "Checking dependencies..."

DEPS=$(get_spec_dependencies "$FEATURE")
UNMET_DEPS=()

for DEP in $DEPS; do
  DEP_STATUS=$(get_spec_status "$DEP")

  if [ "$DEP_STATUS" != "IMPLEMENTED" ]; then
    UNMET_DEPS+=("$DEP ($DEP_STATUS)")
  fi
done

if [ ${#UNMET_DEPS[@]} -gt 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► DEPENDENCIES NOT SATISFIED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Spec '$FEATURE' depends on:"
  for DEP in "${UNMET_DEPS[@]}"; do
    echo "  ✗ $DEP"
  done
  echo ""

  # Offer options
  # (AskUserQuestion would go here)
  # Options: Implement dependencies first | Proceed anyway | Abort
fi
```

### 3. Check Existing Plan

```bash
if [ -f "specs/${FEATURE}/PLAN.md" ]; then
  echo "Plan already exists: specs/${FEATURE}/PLAN.md"
  # Offer: View | Replace | Add more tasks
fi
```

### 4. Research Phase (Auto or Skip)

**Check if research needed:**

```bash
RESEARCH_NEEDED=false

if [ "$SKIP_RESEARCH" != "true" ]; then
  # Check for unfamiliar patterns/libraries in SPEC.md

  # Extract technical mentions
  TECH_MENTIONS=$(grep -iE "library|framework|api|service" "specs/${FEATURE}/SPEC.md" || true)

  # Check if mentioned in codebase
  if [ -n "$TECH_MENTIONS" ]; then
    # Simple heuristic: if spec mentions libraries not in package.json
    PACKAGE_LIBS=$(cat package.json 2>/dev/null | grep "\"" | cut -d'"' -f2 || true)

    for MENTION in $TECH_MENTIONS; do
      if ! echo "$PACKAGE_LIBS" | grep -q "$MENTION"; then
        RESEARCH_NEEDED=true
        break
      fi
    done
  fi
fi
```

**If research needed:**

```bash
if [ "$RESEARCH_NEEDED" = "true" ] && [ "$SKIP_RESEARCH" != "true" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► RESEARCHING"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Spec references unfamiliar patterns/libraries."
  echo "Running research to find best practices..."
  echo ""

  # Spawn researcher
  # Task() call here
fi
```

**Check existing research:**

```bash
if [ -f "specs/${FEATURE}/RESEARCH.md" ]; then
  echo "Using existing research: specs/${FEATURE}/RESEARCH.md"
  RESEARCH_AVAILABLE=true
else
  RESEARCH_AVAILABLE=false
fi
```

### 5. Load Context for Planner

```bash
# Read SPEC.md
SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")

# Read parent SPEC.md if child
if [[ "$FEATURE" == *"/"* ]]; then
  PARENT=$(dirname "$FEATURE")
  if [ -f "specs/${PARENT}/SPEC.md" ]; then
    PARENT_CONTENT=$(cat "specs/${PARENT}/SPEC.md")
  fi
fi

# Read RESEARCH.md if exists
if [ "$RESEARCH_AVAILABLE" = "true" ]; then
  RESEARCH_CONTENT=$(cat "specs/${FEATURE}/RESEARCH.md")
fi

# Read dependency specs for integration context
DEP_CONTEXT=""
for DEP in $DEPS; do
  if [ -f "specs/${DEP}/SPEC.md" ]; then
    DEP_CONTEXT+="### Dependency: $DEP\n"
    DEP_CONTEXT+=$(cat "specs/${DEP}/SPEC.md")
    DEP_CONTEXT+="\n\n"
  fi
done
```

### 6. Spawn Planner Agent

```markdown
<objective>
Create implementation plan for: {feature}

Translate SPEC.md into executable tasks with verification criteria.
</objective>

<spec_context>
{SPEC_CONTENT}
</spec_context>

{If parent exists:}
<parent_context>
Parent spec provides architectural constraints:
{PARENT_CONTENT}
</parent_context>

{If research available:}
<research_findings>
Research provides best practices and recommendations:
{RESEARCH_CONTENT}
</research_findings>

{If dependencies exist:}
<dependency_context>
Dependencies provide:
{DEP_CONTEXT}
</dependency_context>

<instructions>
Follow the planner agent process:
1. Analyze the spec (scope, complexity, constraints)
2. Check if research needed (return RESEARCH NEEDED if so)
3. Break down into 3-8 tasks
4. Honor Implementation Decisions (locked)
5. Use Claude's Discretion (flexible)
6. Exclude Deferred Ideas
7. Apply research findings
8. Define verification criteria
9. Check complexity (kickback if >8 tasks)
10. Write PLAN.md

Return: PLANNING COMPLETE | RESEARCH NEEDED | KICKBACK
</instructions>

<quality_gate>
Before PLANNING COMPLETE:
- [ ] 3-8 tasks (if more, kickback)
- [ ] Verification criteria per task
- [ ] Waves assigned
- [ ] Must-haves from spec
- [ ] Implementation Decisions honored
- [ ] PLAN.md written
</quality_gate>
```

```
Task(
  prompt="First, read ~/.claude/agents/planner.md for your role.\n\n" + planner_prompt,
  subagent_type="general-purpose",
  model="opus",  # Planning needs strong reasoning
  description="Plan {feature}"
)
```

### 7. Handle Planner Return

**Pattern 1: RESEARCH NEEDED**
```markdown
## RESEARCH NEEDED

**Areas:** {list}
```
→ Spawn researcher (step 4), then re-run planner (step 6)

**Pattern 2: KICKBACK**
```markdown
## KICKBACK: {SIGNAL}

**Issue:** {description}
**Recommendation:** {what to do}
```
→ Handle based on signal:
- TOO_MANY_TASKS → Offer to split spec
- SPEC_INCOMPLETE → Return to discussion
- NEEDS_SPLIT → Offer to create hierarchy

**Pattern 3: PLANNING COMPLETE**
```markdown
## PLANNING COMPLETE

**Plan created:** specs/{feature}/PLAN.md
**Tasks:** {N}
```
→ Proceed to verification (step 8)

### 8. Verification (Optional)

Check config for plan verification:

```bash
VERIFY_PLANS=$(cat .flow/config.json 2>/dev/null | grep '"verify_plans"' | grep -o 'true\|false' || echo "true")

if [ "$VERIFY_PLANS" = "true" ]; then
  # Could spawn plan-checker agent here
  # For MVP, skip verification
  echo "Plan verification: Skipped (not implemented yet)"
fi
```

### 9. Commit Plan

```bash
git add "specs/${FEATURE}/PLAN.md"

if [ "$RESEARCH_AVAILABLE" = "true" ]; then
  git add "specs/${FEATURE}/RESEARCH.md"
fi

git commit -m "docs(flow): plan ${FEATURE}

Tasks: ${NUM_TASKS}
Waves: ${NUM_WAVES}
Research: ${RESEARCH_AVAILABLE}
Dependencies: ${#DEPS[@]}
"
```

### 10. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PLAN READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Plan:** specs/{feature}/PLAN.md
**Tasks:** {N} tasks in {M} waves
**Research:** {Completed | Used existing | Skipped}
**Dependencies:** {N} satisfied

### Task Summary
{First few tasks with brief description}

### Execution Plan
Wave 1: {Tasks}
Wave 2: {Tasks}
...

───────────────────────────────────────────────────────
```

### 11. Post-Planning Gate

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "Plan is ready. How do you want to proceed?"
- options:
  - "Execute now" — Run all tasks (Recommended)
  - "Review plan" — Show me the full PLAN.md
  - "Adjust approach" — Refine the plan or spec
```

Routing:
- "Execute now" → `/flow:execute {feature}`
- "Review plan" → Display PLAN.md with Read, then re-present gate
- "Adjust approach" → Return to post-discussion gate (user can re-discuss or edit spec)

## Edge Cases

### Research Loop
```
Plan → RESEARCH NEEDED → Research → Plan → RESEARCH NEEDED (again)

Max 2 research cycles, then proceed with what we have.
```

### Kickback Loop
```
Plan → KICKBACK → User refuses split → Plan again → KICKBACK

Offer: Proceed with complex plan | Split | Adjust spec
```

### Unmet Dependencies
```
Plan → Dependencies not satisfied

Options:
1. Plan dependencies first (recursive)
2. Proceed anyway (execution will fail)
3. Abort
```

## Success Criteria

- [ ] SPEC.md validated
- [ ] Dependencies checked
- [ ] Research completed (if needed)
- [ ] Planner spawned with full context
- [ ] PLAN.md created
- [ ] Committed to git
- [ ] Post-planning gate presented
- [ ] User knows next steps
