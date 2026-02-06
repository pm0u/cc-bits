---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Reconcile spec → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Spec Reconciliation

**If a feature SPEC.md exists** (check `REQUIREMENTS/<feature-name>/SPEC.md`):

Review the implementation against the spec and update SPEC.md to reflect what was actually built.

**For each requirement in the spec, categorize the outcome:**

| Category | Meaning | Action |
|----------|---------|--------|
| **Implemented as specified** | Matches spec exactly | No change needed |
| **Clarification** | Spec was ambiguous, implementation resolved it | Update spec with the clarification |
| **Deviation** | Implementation differs from spec intentionally | Update spec, mark as `**[DEVIATED]**` with reason |
| **Unimplemented** | Requirement was not addressed | Mark as `**[NOT IMPLEMENTED]**` with reason |

**Process:**
1. Read the feature's SPEC.md
2. Walk through each requirement and its acceptance criteria
3. Check the implementation against each one
4. Update SPEC.md with clarifications and deviations inline
5. Report a summary to the user:
   - N requirements implemented as specified
   - N clarifications added
   - N deviations (list each with reason)
   - N not implemented (list each with reason)
6. Ask user to confirm the spec updates before proceeding

**If deviations or unimplemented items exist**, the user may want to address them before merging. Wait for their decision.

**Also update parent index:** If `REQUIREMENTS/SPEC.md` exists, update the feature's status entry.

**If no SPEC.md exists:** Skip this step.

### Step 3: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 4: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 5: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>
```

**If merge conflicts occur:**
1. List conflicted files: `git diff --name-only --diff-filter=U`
2. For each conflict: read the file, understand both sides, resolve
3. Prefer the feature branch's intent — it's the new work
4. If a conflict is ambiguous (both sides changed significantly), STOP and ask your human partner
5. After resolving all conflicts: `git add <resolved-files>`
6. Verify tests pass on the merged result
7. Complete the merge: `git commit`

**Do NOT:** Auto-resolve conflicts by picking one side blindly. Each conflict needs understanding.

```bash
# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 6)

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: Cleanup worktree (Step 6)

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 6)

### Step 6: Cleanup Worktree

**For Options 1, 2, 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

**For Option 3:** Keep worktree.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Only cleanup for Options 1 and 4

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request

**Always:**
- Verify tests before offering options
- Reconcile spec (Step 2) before presenting options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only

## Integration

**Called by:**
- **subagent-driven-development** - After all tasks complete
- **executing-plans** - After all batches complete

**Reads from:** Feature's `REQUIREMENTS/<feature-name>/SPEC.md` (for reconciliation)

**Pairs with:**
- **using-git-worktrees** - Cleans up worktree created by that skill
