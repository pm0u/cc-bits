# Assessment Tiers

The assessment phase determines how much process a task needs. It runs in the main context in under 5 seconds. Three layers, evaluated in order — bail early when the answer is clear.

## Layer 1: Parse Intent

Read the user's message and classify:

| Signal | Weight | Examples |
|--------|--------|---------|
| Single file mentioned | Light | "fix the typo in header.tsx" |
| "quick", "small", "just" | Light | "just add a border to the card" |
| Multiple features mentioned | Full | "add auth and update the dashboard" |
| "refactor", "redesign", "overhaul" | Full | "refactor the API layer" |
| New feature language | Full | "add a user profile system" |
| Bug fix language | Light | "fix the login redirect" |
| Ambiguous | → Layer 2 | "update the settings page" |

**If clear after Layer 1**: Route immediately. Don't waste time on further analysis.

## Layer 2: Check Specs

Read `specs/INDEX.md` (if it exists) and relevant SPEC.md files.

| Situation | Weight | Reason |
|-----------|--------|--------|
| No specs exist at all | Light | Spec-on-touch: don't block first-time users |
| Spec exists, status ACTIVE, no OPEN | Light | Spec is ready, just implement |
| Spec exists, status DRAFT | Full | Spec needs completion first |
| Spec exists, has OPEN items | Full | Must resolve before implementing |
| Spec exists, no acceptance criteria | Full | Must write criteria first |
| No spec for this feature but others exist | Depends | Layer 3 decides |

**How to find relevant specs**:
1. Extract key nouns from the task: "update user profile settings" → user, profile, settings
2. Check INDEX.md for matching spec names
3. Grep spec directories: `ls specs/ | grep -i "{keyword}"`
4. If multiple specs might be relevant, read their summaries (first 5 lines)

## Layer 3: Scope Check

Only reached for ambiguous cases. Estimate scope:

| Factor | Light (≤ threshold) | Full (> threshold) |
|--------|--------------------|--------------------|
| Files likely touched | ≤ 3 | > 3 |
| Specs involved | ≤ 1 | > 1 |
| New acceptance criteria needed | 0 | ≥ 1 |
| Design decisions required | 0 | ≥ 1 |

**Scoring**: If ANY factor hits "Full", go full. Otherwise stay light.

## Assessment Output

The assessment produces a routing decision:

```markdown
**Assessment**: {light | full}
**Reason**: {one-line explanation}
**Relevant specs**: {list of spec paths, or "none"}
**Spec-on-touch**: {yes | no} (whether we need to create a spec)
```

## Upgrade / Downgrade

The initial assessment isn't final. During execution:

**Upgrade light → full when**:
- More files need changing than expected
- A spec conflict is discovered during preflight
- User asks for spec engagement ("let's think about this more")

**Downgrade full → light when**:
- Spec is already clean and complete
- Task turns out simpler than scoping suggested
- User says "just do it" (explicit override)

See also: @~/.claude/plugins/marketplaces/sendit/sendit/references/weight-spectrum.md
