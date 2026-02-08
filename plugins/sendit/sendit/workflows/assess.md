# Assessment Workflow

Determines how much process a task needs. Runs in main context, targets < 5 seconds.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/assessment-tiers.md

## Input

- `task`: The user's request (string)

## Process

<step name="layer-1-intent">

### Layer 1: Parse Intent

Classify the task by language signals:

**Light signals**: single file, "fix", "typo", "quick", "just", "small", "update" (minor), bug fix language
**Full signals**: "add" (new feature), "refactor", "redesign", "overhaul", multiple features, "system", "architecture"
**Ambiguous**: "update" (could be minor or major), "change", "modify", "improve"

If clear → output assessment and stop.
If ambiguous → continue to Layer 2.

</step>

<step name="layer-2-specs">

### Layer 2: Check Specs

```bash
# Check if specs exist at all
ls specs/INDEX.md 2>/dev/null
# Check for global constraints
ls specs/GLOBAL.md 2>/dev/null
```

If `specs/GLOBAL.md` exists, always include it in `relevant_specs`.

If no specs directory exists:
- This is a legacy/new codebase
- Default to **light** (spec-on-touch will handle it)
- Set `spec_on_touch: true` if the task is non-trivial

If specs exist:
1. Read `specs/INDEX.md`
2. Find relevant specs by matching task keywords to spec names
3. For each matching spec, read the first 20 lines (status + summary)
4. Evaluate:
   - Spec ACTIVE + no OPEN → light (ready to implement)
   - Spec DRAFT or has OPEN → full (needs spec work)
   - No matching spec found → depends on Layer 3

If clear → output assessment and stop.
If still ambiguous → continue to Layer 3.

</step>

<step name="layer-3-scope">

### Layer 3: Scope Check

Estimate the task scope:

1. **Files**: How many files will this likely touch?
   - Grep for relevant identifiers to estimate
   - Check import chains if modifying a shared module
2. **Specs**: How many specs are involved?
3. **New criteria**: Does this task need new acceptance criteria?
4. **Decisions**: Are there design decisions to make?

Scoring: ANY factor exceeding the light threshold → full.

| Factor | Light threshold |
|--------|----------------|
| Files | ≤ 3 |
| Specs | ≤ 1 |
| New criteria | 0 |
| Design decisions | 0 |

</step>

## Branch Check

After determining weight, check the current branch:

```bash
git branch --show-current 2>/dev/null
```

If on `main` or `master`, warn the user:
> "You're on `{branch}`. Want to create a feature branch first, or continue here?"

Don't block — just surface it. If the user says continue, proceed.

## Output

```markdown
**Assessment**: {light | full}
**Reason**: {one-line explanation}
**Relevant specs**: {list of paths, or "none"}
**Spec-on-touch**: {true | false}
```

Proceed to: @~/.claude/plugins/marketplaces/sendit/sendit/workflows/preflight.md
