---
name: huckit:executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load Plan and Spec
1. Read the plan file (PLAN.md in the feature's REQUIREMENTS folder)
2. Read the feature's SPEC.md — this is the source of truth for what you're building
3. Review critically — identify any questions or concerns about the plan
4. If concerns: Raise them with your human partner before starting
5. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch
**Default: First 3 tasks**

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Validate against SPEC.md — does the result match the spec's acceptance criteria for this requirement?
5. Mark as completed

### Step 3: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use huckit:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When the Plan is Wrong

Plans can become invalid mid-execution. Recognize and escalate rather than forcing through.

**Signals the plan needs revision:**
- A task's assumptions don't match the codebase reality
- Completing a task would break something the plan didn't account for
- You've discovered the design won't work (missing API, wrong data model, etc.)
- Later tasks depend on an approach that failed in an earlier task

**What to do:**
1. STOP executing immediately
2. Report what you've completed so far and what still works
3. Explain specifically what's wrong — reference the SPEC.md requirement that can't be met and why
4. Suggest concrete alternatives if you see them
5. Wait for your human partner to revise the plan or update the SPEC.md

**Do NOT:**
- Improvise around the plan ("I'll just do it differently")
- Skip tasks that seem broken and do later ones
- Rewrite the plan yourself without discussion

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Reads from:**
- Feature's `REQUIREMENTS/<feature-name>/PLAN.md`
- Feature's `REQUIREMENTS/<feature-name>/SPEC.md` (source of truth for validation)

**Required workflow skills:**
- **huckit:using-git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **huckit:writing-plans** - Creates the plan this skill executes
- **huckit:finishing-a-development-branch** - Complete development after all tasks
