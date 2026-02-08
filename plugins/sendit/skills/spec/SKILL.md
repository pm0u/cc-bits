---
name: sendit:spec
description: Create, edit, view, or split specs directly — manage the spec tree
argument-hint: "<create|edit|view|split|list> [spec-name]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# Spec Management

Direct management of the spec tree. Use this to create, edit, view, split, or list specs without going through the full `/sendit:go` workflow.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md

## Commands

### `create <spec-name>`

Create a new spec from the template.

<process>
<step name="create">

1. Determine the spec path: `specs/{spec-name}/SPEC.md`
2. Check if it already exists:
   ```bash
   ls specs/{spec-name}/SPEC.md 2>/dev/null
   ```
3. If exists, tell user and ask if they want to edit instead
4. If not, create the directory and SPEC.md from template:
   - Read the template: `@~/.claude/plugins/marketplaces/sendit/sendit/templates/spec.md`
   - Replace `{Feature Name}` with the title-cased spec name (kebab-to-title)
   - Write to `specs/{spec-name}/SPEC.md`
5. Ensure `specs/INDEX.md` exists — if not, create from template:
   - Read: `@~/.claude/plugins/marketplaces/sendit/sendit/templates/index.md`
   - Replace `{date}` with today's date
   - Write to `specs/INDEX.md`
6. Add new spec entry to INDEX.md overview table
7. Open the spec for collaborative editing — ask the user what this feature does, then help fill in sections iteratively

</step>
</process>

### `edit <spec-name>`

Edit an existing spec.

<process>
<step name="edit">

1. Read `specs/{spec-name}/SPEC.md`
2. If not found, suggest `create` instead
3. Show current spec summary to user
4. Ask what they want to change
5. Make edits, preserving format from spec-format reference
6. If status changes, validate transition rules (DRAFT→ACTIVE requires no OPEN items)
7. Update INDEX.md health column if OPEN items changed

</step>
</process>

### `view <spec-name>`

View a spec with health analysis.

<process>
<step name="view">

1. Read `specs/{spec-name}/SPEC.md`
2. If not found, list available specs and suggest one
3. Display spec with analysis:
   - Status
   - OPEN item count (0 = ready)
   - Acceptance criteria count
   - Dependency status (are dependent specs healthy?)
   - Files mapping (if populated)

</step>
</process>

### `split <spec-name>`

Split a large spec into sub-specs.

<process>
<step name="split">

1. Read `specs/{spec-name}/SPEC.md`
2. Analyze for natural split boundaries:
   - Requirement groups that form coherent sub-features
   - Sections exceeding 200 lines
   - More than 10 acceptance criteria
3. Propose split plan to user: "I'd split this into: X, Y, Z"
4. On approval:
   a. Create subdirectories: `specs/{spec-name}/{sub-name}/`
   b. Move relevant requirements and acceptance criteria to each sub-spec
   c. Parent spec retains high-level summary and adds dependency references
   d. Create INDEX.md in parent directory if needed
   e. Update root INDEX.md
5. Validate no requirements were lost in the split

</step>
</process>

### `list`

List all specs with health summary.

<process>
<step name="list">

1. Check if `specs/INDEX.md` exists
2. If yes, display it
3. If no, scan for specs:
   ```bash
   find specs -name "SPEC.md" 2>/dev/null | sort
   ```
4. For each spec found, read status and OPEN count
5. Display summary table
6. If no specs exist, tell user: "No specs yet. Use `/sendit:spec create <name>` to start."

</step>
</process>

## Default Behavior

If called without arguments or with just a spec name (no command):
- No args → `list`
- Spec name only → `view <spec-name>`
