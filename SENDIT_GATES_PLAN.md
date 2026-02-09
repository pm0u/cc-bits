# Adding FUCKIT-Style Gates to SENDIT

## Problem Analysis

### What FUCKIT Has (That SENDIT Lacks)

**FUCKIT's explicit decision gates:**

1. **After `/fuckit:discuss-phase`:**
   ```
   ## ▶ Next Up

   /fuckit:plan-phase ${PHASE}

   ## Also available:
   - /fuckit:plan-phase ${PHASE} --skip-research
   - Review/edit CONTEXT.md before continuing
   ```

2. **After `/fuckit:research-phase`:**
   ```
   Offers: Plan phase | Dig deeper | Review full | Done
   ```

3. **After research within `/fuckit:plan-phase`:**
   - Research completes → offers to proceed to planning or research more
   - Creates CONTEXT.md that constrains what researcher investigates
   - CONTEXT.md has sections: Decisions | Claude's Discretion | Deferred Ideas

### What SENDIT Does Currently

**SENDIT's automatic flow:**
- Spec engagement → (tests if spec changed) → (research if needed) → planning → execution
- User doesn't get explicit control points between stages
- After spec engagement completes, it just proceeds automatically
- Research decision is automatic (based on heuristics, not user choice)

### The Gap

SENDIT is missing the **conversational checkpoints** that let the user:
1. Choose when to stop discussing and move to research
2. Choose to research before planning (or skip research)
3. Return to discussion after seeing research results
4. Have explicit control over the flow transitions

This leads to:
- Less clarity about what's happening next
- Missing opportunities to refine requirements after research
- Automatic research decisions that might miss user's intent
- Feeling of "it just does what it wants" vs "I'm driving this"

---

## Solution: Add Explicit Gates

### Gate 1: Post-Spec-Engagement Gate

**When:** After spec engagement completes (questioning done, SPEC.md created/updated)

**Present options:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SENDIT ► SPEC READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spec:** specs/{feature}/SPEC.md
**Status:** ACTIVE
**Ready gate:** ✓ PASSED

{Show summary of requirements and acceptance criteria}

───────────────────────────────────────────────────────

## ▶ What's Next?

Use AskUserQuestion (single-select):
- header: "Next step"
- question: "How do you want to proceed?"
- options:
  1. "Continue" — Proceed to planning (includes research if needed) (Recommended)
  2. "Discuss more" — Refine the spec further
  3. "Plan without research" — Skip research and plan directly
```

**Routing:**
- "Continue" → Proceed to planning stage (which auto-includes research if needed)
- "Discuss more" → Re-enter spec engagement (questioning mode)
- "Plan without research" → Proceed to planning stage with `skip_research = true` flag

**How research works:**
- Like fuckit, research is **automatic within the planning stage**, not a separate step
- Planner checks if research is needed (unfamiliar patterns/libraries)
- If needed, spawns researcher agent, then continues to planning
- User can opt-out with "Plan without research"

**Auto-decision (configurable):**
- If weight is "light" and spec is clean → auto-select "Continue" with announcement
- If weight is "full" → always present gate
- Can be configured via `config.gates.post_spec_engagement = "auto" | "always" | "never"`

---

### Gate 2: Post-Planning Gate (Already Exists Implicitly)

**When:** After planning completes (PLAN.md created, plan-checker passed)

**Present options:** (enhance existing presentation)

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SENDIT ► PLAN READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Plan:** specs/{feature}/PLAN.md
**Tasks:** {N} tasks
**Verification:** ✓ PASSED
**Research:** {Completed | Used existing | Skipped}

{Show task summary}

───────────────────────────────────────────────────────

## ▶ What's Next?

Use AskUserQuestion (single-select):
- header: "Next step"
- question: "Ready to execute?"
- options:
  1. "Execute now" — Run all tasks (Recommended)
  2. "Review plan" — Show me the full plan first
  3. "Adjust approach" — Refine the plan or spec
```

**Routing:**
- "Execute now" → Proceed to execution stage
- "Review plan" → Display PLAN.md, then re-present this gate
- "Adjust approach" → Return to spec engagement (user can choose to discuss more or re-plan)

---

## Implementation Changes

### 1. Update `sendit:go` Workflow

**Current flow (step 3):**
```
### 3. Spec Engagement (conditional)
...
Track: `spec_changed` = true | false
```

**New flow:**
```
### 3. Spec Engagement (conditional)
...
Track: `spec_changed` = true | false

### 3.5. Post-Spec-Engagement Gate
@~/.claude/plugins/marketplaces/sendit/sendit/workflows/gates/post-spec-engagement.md

Present gate options based on weight and config.
Route based on user choice.

If "Continue" selected → proceed to planning (step 6) with auto-research enabled
If "Discuss more" selected → return to spec engagement (step 3)
If "Plan without research" selected → proceed to planning (step 6) with skip_research flag
```

### 2. Create New Workflow Files

```
plugins/sendit/sendit/workflows/gates/
├── post-spec-engagement.md   # Gate 1 logic
└── post-planning.md           # Gate 2 logic (enhance existing)
```

### 3. Add Configuration Support

**Update `sendit/references/config.md`:**

```json
{
  "sendit": {
    "gates": {
      "post_spec_engagement": "always",  // "auto" | "always" | "never"
      "post_planning": "always"           // "auto" | "always" | "never"
    }
  }
}
```

**Behavior:**
- `"always"` — Always present the gate (recommended for learning/complex work)
- `"auto"` — Present gate in full mode, skip in light mode
- `"never"` — Skip gate, proceed automatically (current behavior)

### 4. Update Planner to Include Auto-Research

**Integrate research into planning stage (matching fuckit pattern):**

Currently:
```
### 5. Research (conditional)
[separate step before planning]

### 6. Planning
[separate step after research]
```

New approach:
```
### 5. Planning (includes research if needed)

Within the planning workflow:
1. Check if research is needed (heuristic or explicit flag)
2. If needed AND not skip_research flag:
   - Spawn researcher agent
   - Write RESEARCH.md
   - Display: "Research complete. Proceeding to planning..."
3. Spawn planner agent (with research context if available)
4. Run plan-checker verification
5. Present Post-Planning Gate
```

Research triggers:
1. Heuristic check (unfamiliar libraries, external APIs)
2. KICKBACK with signal: "needs_research"
3. Spec explicitly marks section as [RESEARCH NEEDED]

Can be skipped:
1. User selects "Plan without research" at Post-Spec-Engagement Gate
2. Config: `workflow.research = false`
3. Research already exists (RESEARCH.md present)

This makes research **automatic within planning** like fuckit, not a separate user-invoked step.

---

## Benefits

### 1. **Explicit Control Points**
- User chooses when to transition between stages
- No "it just does what it wants" feeling
- Clear decision moments

### 2. **Iterative Refinement**
- Can discuss more before committing to plan
- If plan reveals issues, can return to spec engagement
- Matches how real planning works

### 3. **Reduced Context Loss**
- Gates force you to pause and review
- User sees what's been done before proceeding
- Research status visible at planning gate
- Less "wait, what just happened?"

### 4. **Caught Errors Earlier**
- User can spot spec issues before committing to planning
- Can choose to discuss more if spec feels incomplete
- Planning issues caught before execution

### 5. **Better Learning**
- User understands the workflow stages
- Clear progression through the pipeline
- Matches mental model of "discuss → plan (with research) → execute"

---

## Migration Path

### Phase 1: Add Gates (Opt-In)
- Create gate workflow files
- Add configuration support
- Default to `"never"` (current behavior)
- Document new gates in help

### Phase 2: Make Gates Default for Full Mode
- Change default to `"auto"`
- Full mode shows gates
- Light mode skips gates
- Update docs

### Phase 3: Refine Based on Usage
- Gather feedback on gate UX
- Adjust option wording
- Consider adding more gates (e.g., post-test-writing)

---

## Open Questions

1. **Should there be a gate after test-writing?**
   - Could offer: "Review tests | Add more tests | Proceed to planning"
   - Might be too many gates?

2. **How to handle KICKBACK mid-flow?**
   - Currently KICKBACK routes automatically
   - Should KICKBACK trigger a gate? "The planner kicked back. Want to: Fix spec | Split spec"

3. **What about multi-spec flows?**
   - Do gates apply per child spec?
   - Or only at parent level?

4. **Should we show research findings before the planning gate?**
   - If research ran during planning, show key findings before presenting gate
   - Give user option to "Review research" before executing

---

## Example Flow Comparison

### Before (Current SENDIT)

```
User: "Add user authentication"
→ Assessment: Full weight
→ Spec engagement: [questions asked, SPEC.md created]
→ [Automatic research decision: happens during planning]
→ Planning: [research runs silently, PLAN.md created]
→ Execution: [code written]
```

**User experience:** "It just did everything automatically. I didn't even know research ran."

### After (With Gates)

```
User: "Add user authentication"
→ Assessment: Full weight
→ Spec engagement: [questions asked, SPEC.md created]
→ Gate: "Continue | Discuss more | Plan without research"
  User picks: "Continue" (recommended)
→ Planning:
  - Checking if research needed... yes (JWT patterns not in codebase)
  - Researching authentication patterns...
  - Research complete: JWT, session management, security patterns
  - Creating implementation plan...
  - PLAN.md created
→ Gate: "Execute now | Review plan | Adjust approach"
  User picks: "Review plan" (wants to see research impact)
  [Shows PLAN.md with JWT approach]
→ Gate: "Execute now | Review plan | Adjust approach"
  User picks: "Adjust approach"
→ Spec engagement: [realizes wants OAuth instead, updates spec]
→ Gate: "Continue | Discuss more | Plan without research"
  User picks: "Continue"
→ Planning: [re-plans with OAuth approach]
→ Gate: "Execute now | Review plan | Adjust approach"
  User picks: "Execute now"
→ Execution: [code written]
```

**User experience:** "I had control points to pause and review. When I saw the JWT approach in the plan, I realized I actually needed OAuth, so I adjusted the spec before executing. Research happened automatically but visibly."

---

## Summary

The key insight is that **FUCKIT's strength is explicit control gates**, while **SENDIT's strength is the spec-driven approach**.

By adding FUCKIT-style gates to SENDIT, we get:
- ✅ Spec as source of truth (SENDIT)
- ✅ Explicit control points (FUCKIT)
- ✅ Research automatic within planning (FUCKIT pattern)
- ✅ Clear workflow stages (both)

The gates transform SENDIT from "automatic workflow" to "guided workflow with control points."

**Key alignment with FUCKIT:**
- Research is NOT a separate user-invoked step
- Research happens automatically during planning (like `/fuckit:plan-phase`)
- User can opt-out with "Plan without research" (like `--skip-research`)
- Gates provide pause points to review and adjust, not separate research triggers
