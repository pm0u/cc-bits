---
name: verify-phase
description: |
  Verify phase goal achievement and validate spec triangle (spec ↔ tests ↔ code). Runs after execute-phase completes to ensure goals are met and specs stay synchronized.
dependencies:
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - .planning/phases/{NN}-{name}/
args: "PHASE_NUM"
---

<purpose>
Verify that a completed phase actually achieved its goal and that the spec triangle remains consistent.

**Two-stage verification:**
1. **Goal-backward verification** (spek:verifier) - Did we achieve what we promised?
2. **Triangle validation** (spek:spec-enforcer) - Is spec ↔ tests ↔ code consistent?

This is a separate skill from execute-phase because:
- Verification can be re-run without re-executing
- Clear separation: execution vs validation
- Can verify multiple phases or old phases independently
</purpose>

<approach>
**Philosophy: Outcomes over outputs**

Tasks can be marked "complete" when code is stubbed. Verification checks that actual functionality exists, not just that tasks were done.

**Goal-backward analysis:**
1. What must be TRUE for the goal to be achieved?
2. What must EXIST for those truths to hold?
3. What must be WIRED for those artifacts to function?

Then verify each level against the actual codebase.

**Triangle validation:**
- Edge 1: Spec → Tests (every acceptance criterion has test coverage)
- Edge 2: Tests → Code (all tests GREEN)
- Edge 3: Code → Spec (implementation matches exactly, no scope creep)
</approach>

<verbose_mode>
**Context tracking for verification:**

After each verification stage, show:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► Phase {X} Verification Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Goal verification:** {status}
**Triangle validation:** {status}
**Must-haves:** {N}/{M} verified
**Spec updates:** {files updated}

**Context used:** ~{X}% (estimated from response size)
```

**Context estimation:**
- Base: 10% for loading phase context
- Verifier agent: ~15-20%
- Spec-enforcer agent: ~15-20%
- Total estimate: ~40-50% per phase verification
</verbose_mode>

<process>

<step name="validate_phase">
**1. Validate phase argument**

```bash
PHASE_ARG="$1"

if [ -z "$PHASE_ARG" ]; then
  echo "Error: Phase number required"
  echo "Usage: /spek:verify-phase N"
  exit 1
fi

# Find phase directory (match both zero-padded and unpadded)
PADDED_PHASE=$(printf "%02d" ${PHASE_ARG} 2>/dev/null || echo "${PHASE_ARG}")
PHASE_DIR=$(ls -d .planning/phases/${PADDED_PHASE}-* .planning/phases/${PHASE_ARG}-* 2>/dev/null | head -1)

if [ -z "$PHASE_DIR" ]; then
  echo "Error: Phase $PHASE_ARG not found"
  exit 1
fi

PHASE_NUM=$(basename "$PHASE_DIR" | grep -o "^[0-9]*")
PHASE_NAME=$(basename "$PHASE_DIR" | sed "s/^${PHASE_NUM}-//")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEK ► Verify Phase ${PHASE_NUM}: ${PHASE_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```
</step>

<step name="check_already_verified">
**2. Check if already verified**

```bash
# Check STATE.md
STATE_STATUS=$(grep "^Status:" .planning/STATE.md 2>/dev/null | head -1)

if [[ "$STATE_STATUS" == *"Phase verified"* ]] && [ -f "${PHASE_DIR}/${PHASE_NUM}-VERIFICATION.md" ]; then
  echo "Phase $PHASE_NUM already verified."
  echo ""
  echo "Re-verify anyway? (y/n)"
  read -r RESPONSE

  if [[ "$RESPONSE" != "y" ]]; then
    echo "Skipping verification."
    exit 0
  fi

  echo "Re-running verification..."
  echo ""
fi
```
</step>

<step name="load_context">
**3. Load verification context**

```bash
# Phase goal from ROADMAP
PHASE_GOAL=$(grep -A 10 "^### Phase ${PHASE_NUM}:" .planning/ROADMAP.md | grep -v "^###" | head -5)

# Requirements mapped to this phase (if REQUIREMENTS.md exists)
PHASE_REQS=$(grep -A 10 "^### Phase ${PHASE_NUM}:" .planning/ROADMAP.md | grep "^Requirements:" | sed 's/Requirements: //')

# Count summaries (completed plans)
SUMMARY_COUNT=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')

# Find child spec for this phase
PARENT_SPEC=$(find specs -maxdepth 2 -name "SPEC.md" -type f | head -1)

if [ -n "$PARENT_SPEC" ]; then
  PARENT_DIR=$(dirname "$PARENT_SPEC")
  CHILD_SPEC=$(find "$PARENT_DIR" -name "SPEC.md" -path "*/${PHASE_NAME}/*" | head -1)

  # If no exact match, use parent spec
  if [ -z "$CHILD_SPEC" ]; then
    CHILD_SPEC="$PARENT_SPEC"
  fi
fi

echo "Verification context:"
echo "  Phase: ${PHASE_NUM} - ${PHASE_NAME}"
echo "  Summaries: ${SUMMARY_COUNT}"
echo "  Spec: ${CHILD_SPEC}"
echo ""
```
</step>

<step name="goal_verification">
**4. Goal-backward verification**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► GOAL VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Checking if phase goal was actually achieved...
```

**Check workflow config:**
```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")

WORKFLOW_VERIFIER=$(cat .planning/config.json 2>/dev/null | grep -o '"verifier"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
```

**Model lookup:**
| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| spek:verifier | sonnet | sonnet | haiku |

**If `workflow.verifier` is `false`:**
```bash
echo "⊗ Goal verification disabled in config"
echo "  (Set workflow.verifier: true to enable)"
echo ""
# Skip to step 5 (triangle validation)
```

**Otherwise, spawn spek:verifier:**

Load context for verifier:
```bash
# Read spec content
if [ -n "$CHILD_SPEC" ]; then
  SPEC_CONTENT=$(cat "$CHILD_SPEC")
else
  SPEC_CONTENT="(no spec found for this phase)"
fi

# Read all summaries
SUMMARIES=$(cat "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null)

# Read all plans (for must_haves)
PLANS=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)
```

Spawn verifier agent:
```
Task(
  prompt="Verify goal achievement for Phase ${PHASE_NUM}: ${PHASE_NAME}

<phase_context>
**Goal:** ${PHASE_GOAL}

**Requirements:** ${PHASE_REQS}

**Spec:**
${SPEC_CONTENT}

**Plans (extract must_haves from frontmatter):**
${PLANS}

**Summaries (claims to verify):**
${SUMMARIES}
</phase_context>

<instructions>
Read your role: ~/.claude/agents/verifier.md

Perform goal-backward verification:

1. Extract must_haves from all plan frontmatter
2. For each must_have: verify against actual codebase (not summary claims)
3. Check that files exist, are wired correctly, and deliver functionality
4. Create ${PHASE_DIR}/${PHASE_NUM}-VERIFICATION.md report

Return status:
- **passed** - All must_haves verified in codebase
- **human_needed** - Some items need manual verification
- **gaps_found** - Missing functionality detected

Also: Update child SPEC.md Files sections (see verifier.md lines 738-857)
</instructions>
",
  subagent_type="spek:verifier",
  model="${VERIFIER_MODEL}",
  description="Verify Phase ${PHASE_NUM} goal"
)
```

**Handle verifier response:**

Check output for status markers:
```bash
if grep -q "## VERIFICATION PASSED" <<< "$VERIFIER_OUTPUT"; then
  echo "✓ Goal verification passed"
  GOAL_STATUS="passed"

elif grep -q "## HUMAN VERIFICATION NEEDED" <<< "$VERIFIER_OUTPUT"; then
  echo "◆ Human verification needed"
  echo ""

  # Extract checklist
  CHECKLIST=$(echo "$VERIFIER_OUTPUT" | sed -n '/^- \[ \]/p')
  echo "$CHECKLIST"
  echo ""
  echo "Have you verified these items? (y/n)"
  read -r HUMAN_RESPONSE

  if [[ "$HUMAN_RESPONSE" == "y" ]]; then
    GOAL_STATUS="passed"
  else
    echo "Verification incomplete. Address items and re-run /spek:verify-phase ${PHASE_NUM}"
    exit 1
  fi

elif grep -q "## GAPS FOUND" <<< "$VERIFIER_OUTPUT"; then
  echo "✗ Gaps detected in phase implementation"
  echo ""
  echo "$VERIFIER_OUTPUT"
  echo ""
  echo "Create gap closure plan? (y/n)"
  read -r GAP_RESPONSE

  if [[ "$GAP_RESPONSE" == "y" ]]; then
    echo "Run: /spek:plan-phase ${PHASE_NUM} --gaps"
    exit 1
  else
    echo "Verification blocked by gaps."
    exit 1
  fi
fi
```
</step>

<step name="triangle_validation">
**5. Triangle validation (postflight)**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► TRIANGLE VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Validating spec ↔ tests ↔ code consistency...
```

**Gather context:**
```bash
# Get test files from spec
if [ -n "$CHILD_SPEC" ]; then
  TEST_FILES=$(sed -n '/^## Test Files/,/^## /p' "$CHILD_SPEC" | grep -v "^##" | grep -v "^$")

  # Get implementation files from spec
  IMPL_FILES=$(sed -n '/^## Files/,/^## /p' "$CHILD_SPEC" | grep -v "^##" | grep -v "^$")
fi

# Get files modified during this phase (from summaries)
MODIFIED_FILES=$(cat "${PHASE_DIR}"/*-SUMMARY.md | grep -E "^\s*-\s+\w+/.+" | sed 's/^\s*-\s*//' | sort -u)
```

**Spawn spek:spec-enforcer in postflight mode:**

```
Task(
  prompt="Validate spec triangle for Phase ${PHASE_NUM}: ${PHASE_NAME}

<postflight_context>
**Mode:** postflight

**Spec:**
${SPEC_CONTENT}

**Test Files (from spec):**
${TEST_FILES}

**Implementation Files:**
${IMPL_FILES}
${MODIFIED_FILES}

**Summaries:**
${SUMMARIES}
</postflight_context>

<instructions>
Read your role: ~/.claude/agents/spec-enforcer.md

Validate three edges of the triangle:

**Edge 1: Spec → Tests (Coverage)**
- Extract all acceptance criteria from CHILD_SPEC
- For each criterion, check if corresponding tests exist
- Search test files for keywords/phrases from criterion
- Generate coverage report:
  - "X/Y acceptance criteria have test coverage"
  - List covered criteria: ✓ Criterion 1 → test_file.test.ts:42
  - List uncovered criteria: ✗ Criterion 3 (no tests found)
- **Severity:**
  - If >80% covered: PASS
  - If 50-80% covered: WARNING (some gaps)
  - If <50% covered: CRITICAL (major gaps)

**Edge 2: Tests → Code (All Pass)**
- Run test suite (npm test, pytest, go test, cargo test)
- Verify all tests GREEN (exit code 0)
- Report failures with details
- **Severity:**
  - All pass: PASS
  - Any fail: CRITICAL

**Edge 3: Code → Spec (Exact Match)**
- Does implementation match requirements? (no more, no less)
- Check for scope creep (extra features not in spec)
- Check for missing requirements (spec says X, code doesn't have it)
- Compare SUMMARIES against acceptance criteria
- **Severity:**
  - Exact match: PASS
  - Extra features: WARNING (scope creep)
  - Missing features: CRITICAL (incomplete)

**Also:**
- Update child SPEC.md Files section if needed
- Update child SPEC.md Test Files section if needed
- Mark requirements complete: [ ] → [x]

Return:
## POSTFLIGHT PASS or ## POSTFLIGHT DRIFT
</instructions>
",
  subagent_type="spek:spec-enforcer",
  model="sonnet",
  description="Postflight validation Phase ${PHASE_NUM}"
)
```

**Handle postflight response:**

```bash
if grep -q "## POSTFLIGHT PASS" <<< "$POSTFLIGHT_OUTPUT"; then
  echo "✓ Triangle validated - spec ↔ tests ↔ code consistent"
  echo ""

  # Show SPEC.md updates
  SPEC_UPDATES=$(echo "$POSTFLIGHT_OUTPUT" | sed -n '/SPEC.md updates:/,/^$/p')
  if [ -n "$SPEC_UPDATES" ]; then
    echo "$SPEC_UPDATES"
    echo ""
  fi

  TRIANGLE_STATUS="pass"

elif grep -q "## POSTFLIGHT DRIFT" <<< "$POSTFLIGHT_OUTPUT"; then
  echo "⚠ Triangle drift detected"
  echo ""
  echo "$POSTFLIGHT_OUTPUT"
  echo ""

  # Extract severity
  SEVERITY=$(echo "$POSTFLIGHT_OUTPUT" | grep "Severity:" | grep -o "CRITICAL\|WARNING")

  if [[ "$SEVERITY" == "CRITICAL" ]]; then
    echo "Critical drift blocks verification."
    echo "Create gap closure plan? (y/n)"
    read -r DRIFT_RESPONSE

    if [[ "$DRIFT_RESPONSE" == "y" ]]; then
      echo "Run: /spek:plan-phase ${PHASE_NUM} --gaps"
      exit 1
    else
      exit 1
    fi
  else
    echo "Warning-level drift detected."
    echo "Fix now (f), accept drift (a), or abort (x)?"
    read -r WARNING_RESPONSE

    case "$WARNING_RESPONSE" in
      f)
        echo "Run: /spek:plan-phase ${PHASE_NUM} --gaps"
        exit 1
        ;;
      a)
        echo "Accepting drift. Proceeding with verification."
        TRIANGLE_STATUS="pass_with_warnings"
        ;;
      *)
        exit 1
        ;;
    esac
  fi
fi
```
</step>

<step name="update_state">
**6. Update state files**

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEK ► Updating State"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Update STATE.md status to verified
sed -i.bak "s/^Status:.*/Status: Phase verified/" .planning/STATE.md
rm .planning/STATE.md.bak

echo "✓ Updated STATE.md: Status → Phase verified"

# Update ROADMAP.md phase status (mark as complete)
# Find phase line and update status marker if present
sed -i.bak "/^### Phase ${PHASE_NUM}:/ s/\[.*\]/[✓]/" .planning/ROADMAP.md
rm .planning/ROADMAP.md.bak

echo "✓ Updated ROADMAP.md: Phase ${PHASE_NUM} marked complete"
```
</step>

<step name="update_requirements">
**7. Update requirements traceability**

```bash
# If REQUIREMENTS.md exists and this phase has requirements
if [ -f ".planning/REQUIREMENTS.md" ] && [ -n "$PHASE_REQS" ]; then
  echo ""
  echo "Updating requirements traceability..."

  # For each requirement ID, change Status from Pending to Complete
  for REQ_ID in $(echo "$PHASE_REQS" | tr ',' ' '); do
    sed -i.bak "s/| ${REQ_ID} | Pending /| ${REQ_ID} | Complete /" .planning/REQUIREMENTS.md
    echo "  ✓ ${REQ_ID}: Pending → Complete"
  done

  rm .planning/REQUIREMENTS.md.bak 2>/dev/null
fi
```
</step>

<step name="commit_completion">
**8. Commit phase completion**

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEK ► Committing Completion"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check config for commit setting
COMMIT_PLANNING=$(cat .planning/config.json 2>/dev/null | grep -o '"COMMIT_PLANNING_DOCS"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

if [[ "$COMMIT_PLANNING" == "false" ]]; then
  echo "⊗ Planning doc commits disabled in config"
  echo ""
else
  # Stage all planning updates
  git add .planning/STATE.md .planning/ROADMAP.md

  # Stage REQUIREMENTS.md if exists and was updated
  if [ -f ".planning/REQUIREMENTS.md" ] && [ -n "$PHASE_REQS" ]; then
    git add .planning/REQUIREMENTS.md
  fi

  # Stage VERIFICATION.md if created
  if [ -f "${PHASE_DIR}/${PHASE_NUM}-VERIFICATION.md" ]; then
    git add "${PHASE_DIR}/${PHASE_NUM}-VERIFICATION.md"
  fi

  # Stage child spec if updated
  if [ -n "$CHILD_SPEC" ] && [ -f "$CHILD_SPEC" ]; then
    git add "$CHILD_SPEC"
  fi

  # Commit
  git commit -m "docs(spek): verify phase ${PHASE_NUM} - ${PHASE_NAME}

Phase ${PHASE_NUM} verification complete:
- Goal verification: ${GOAL_STATUS}
- Triangle validation: ${TRIANGLE_STATUS}
- Requirements updated: ${PHASE_REQS}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

  COMMIT_HASH=$(git rev-parse --short HEAD)
  echo "✓ Committed: ${COMMIT_HASH}"
  echo ""
fi
```
</step>

<step name="offer_next">
**9. Offer next steps**

```bash
# Check if there are more phases
CURRENT_PHASE_NUM=$(grep "^Phase:" .planning/STATE.md | grep -o "[0-9]*")
TOTAL_PHASES=$(grep -c "^### Phase" .planning/ROADMAP.md)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEK ► PHASE ${PHASE_NUM} VERIFIED ✓"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "**Phase ${PHASE_NUM}: ${PHASE_NAME}**"
echo ""
echo "Goal verification: ${GOAL_STATUS}"
echo "Triangle validation: ${TRIANGLE_STATUS}"
echo ""

if [ "$CURRENT_PHASE_NUM" -lt "$TOTAL_PHASES" ]; then
  NEXT_PHASE=$((CURRENT_PHASE_NUM + 1))

  echo "───────────────────────────────────────────────────────────────"
  echo ""
  echo "## ▶ Next Up"
  echo ""
  echo "Phase ${NEXT_PHASE} ready to plan"
  echo ""
  echo "Continue:"
  echo "  /spek:go              - Auto-route to next action"
  echo "  /spek:plan-phase ${NEXT_PHASE}  - Plan next phase"
  echo ""
else
  echo "───────────────────────────────────────────────────────────────"
  echo ""
  echo "## 🎉 All Phases Complete!"
  echo ""
  echo "Milestone complete - all phases planned, executed, and verified."
  echo ""
  echo "Next steps:"
  echo "  /spek:audit-milestone    - Review before archiving"
  echo "  /spek:complete-milestone - Archive and close"
  echo "  /spek:new-milestone      - Start next milestone"
  echo ""
fi
```
</step>

</process>

<success_criteria>
- [ ] Phase directory validated
- [ ] Skips if already verified (with confirmation option)
- [ ] Loads context: goal, requirements, spec, summaries
- [ ] Spawns spek:verifier for goal-backward verification
- [ ] Handles verifier response (passed/human_needed/gaps_found)
- [ ] Spawns spek:spec-enforcer for triangle validation
- [ ] Handles postflight response (pass/drift)
- [ ] Updates STATE.md to "Phase verified"
- [ ] Updates ROADMAP.md phase marker
- [ ] Updates REQUIREMENTS.md (marks complete)
- [ ] Commits phase completion
- [ ] Routes to next phase or milestone complete
</success_criteria>

<notes>
**Design Philosophy:**

This skill separates verification from execution for:
1. **Recoverability** - Can re-verify without re-executing
2. **Clarity** - Explicit state: "Execution complete" vs "Phase verified"
3. **Flexibility** - Can verify old phases, multiple phases, or without executing

**Integration with execute-phase:**
- execute-phase ends with "Status: Execution complete"
- verify-phase starts when status is "Execution complete"
- verify-phase ends with "Status: Phase verified"
- go skill routes based on these status values

**Verification vs Execution:**
- **Execution** = making changes (write code, run tests, commit)
- **Verification** = checking outcomes (goals achieved, triangle valid)

Keeping them separate makes the state machine more explicit and recoverable.
</notes>
