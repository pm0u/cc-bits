---
name: sendit:reverse-spec
description: Generate a SPEC.md from existing code — document what's already built
argument-hint: "<path or feature-name>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# Reverse Spec

Generate a spec FROM existing code. Useful for:
- Legacy codebases adopting sendit (spec-on-touch)
- Documenting undocumented features
- Creating a baseline before refactoring

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md

<process>
<step name="identify-scope">

### 1. Identify Scope

Determine what code to analyze:

**If path provided**: Analyze that file/directory directly.

**If feature name provided**: Find relevant code:
```bash
# Search for the feature keyword in source files
grep -rl "{feature}" src/ lib/ app/ --include="*.ts" --include="*.js" --include="*.py" --include="*.go" 2>/dev/null | head -20
```

**If ambiguous**: Ask user to narrow the scope:
> "I found {N} files mentioning '{feature}'. Which area should I focus on?"

</step>

<step name="analyze-code">

### 2. Analyze Code

Read the relevant source files and extract:

1. **Purpose**: What does this code do? (becomes Context section)
2. **Behavior**: What are the observable behaviors? (becomes Requirements)
3. **Boundaries**: What inputs/outputs does it have? (becomes Acceptance Criteria)
4. **Decisions**: What non-obvious choices were made? (becomes Design Decisions)
5. **Dependencies**: What does it depend on? What depends on it?

Also find existing tests:
```bash
# Find related test files
find . -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" 2>/dev/null | xargs grep -l "{feature}" 2>/dev/null
```

If tests exist, extract what they verify — these become acceptance criteria.

</step>

<step name="generate-spec">

### 3. Generate Spec

Create `specs/{feature}/SPEC.md`:

- **Status**: ACTIVE (it's already implemented, we're documenting it)
- **Context**: Derived from code purpose and comments
- **Requirements**: Derived from actual behavior (what the code DOES, not what we wish it did)
- **Acceptance criteria**: Derived from existing tests + observable behavior
- **Design decisions**: Non-obvious patterns found in the code
- **Files**: Pre-populated from the analyzed source files
- **Test Files**: Pre-populated from found test files
- **OPEN**: Items where behavior is unclear or seems unintentional

Important: Document what IS, not what SHOULD BE. Reverse specs capture reality.

</step>

<step name="present">

### 4. Present and Confirm

Show the generated spec to the user:
> "Here's what I found in the code. Does this accurately capture the feature?"

Common follow-ups:
- "That's not right, it actually does X" → update spec
- "There's more to it" → expand scope and re-analyze
- "Looks good" → finalize and add to INDEX.md

Update `specs/INDEX.md` with the new entry.

</step>
</process>

## Notes

- Reverse specs document WHAT IS, not WHAT SHOULD BE
- If the code is buggy, the spec documents the intended behavior (ask user if unclear)
- OPEN items flag unclear or suspicious behavior for user review
- The generated spec is a starting point — expect refinement
