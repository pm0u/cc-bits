---
name: trak:compact
description: Compress LESSONS.md — merge duplicates, condense stale entries, archive obsolete ones
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
Compress `.trak/LESSONS.md` to keep it useful as context grows. Merge duplicate lessons, condense verbose entries to concise ones, and archive entries that are no longer relevant. Show the user a before/after diff and get approval before writing.
</objective>

<why>
LESSONS.md is append-only during normal execution. Over time it accumulates redundant entries, superseded decisions, and lessons so well-internalized they don't need restating. A bloated LESSONS.md wastes executor context on noise. Compact it periodically — after every ~10 goals, or when it starts feeling repetitive.
</why>

<compaction_tiers>
Different lesson types have different decay rates:

- **Pitfalls** — decay slowest. A pitfall that burned you once can burn you again. Keep these longer and compress last.
- **Decisions** — medium decay. Architectural decisions matter until they're revisited. Compress when superseded by a newer decision in the same area.
- **Patterns** — fastest decay. Once a pattern is well-established in the codebase, the reminder loses value. Merge duplicates and condense verbose explanations.
</compaction_tiers>

<process>

<step name="check_exists">
**Check if .trak/ exists**

```bash
ls .trak/LESSONS.md 2>/dev/null
```

If `.trak/` doesn't exist, tell the user: "No trak board found. Run `/trak:init` to get started."
</step>

<step name="read_context">
**Read lessons and history**

Read in parallel:
1. `.trak/LESSONS.md` — full content
2. `.trak/HISTORY.md` — last 50 lines (recent completed goals for context on what's still active)
3. `.trak/PROJECT.md` — Key Decisions section (to understand what's still authoritative)

Count the total character length of LESSONS.md. If under 2000 characters, tell the user: "LESSONS.md is small enough — no compaction needed yet." and stop.
</step>

<step name="analyze">
**Identify candidates for compression**

Review each entry across all sections and flag:

- **Duplicate/overlapping**: Two entries that say the same thing in different words → merge into one
- **Verbose → concise**: A multi-sentence entry whose core insight fits in one line → compress
- **Superseded**: An older decision that a newer decision in the same section replaces → archive the old one
- **Project-complete**: A lesson about scaffolding, setup, or one-time work that's now done → archive

Do NOT compress:
- Pitfalls that describe subtle non-obvious failure modes
- Decisions that are still actively constraining future work
- Any entry that would lose meaningful signal if shortened
</step>

<step name="produce_compressed">
**Produce the compressed LESSONS.md**

Write a new version of LESSONS.md with:

1. **Patterns section**: Concise — 1-2 sentences max per entry. Include a file path reference if one exists. Merge entries that describe the same pattern in different words into one canonical entry.

2. **Pitfalls section**: Keep detail for genuinely tricky pitfalls — up to 2 sentences. Remove entries that have been fully addressed (e.g., "we fixed X in ticket #5").

3. **Decisions section**: Keep the most recent decision per topic area. If an older decision was superseded, replace rather than keep both. One concise sentence per decision with the core rationale.

4. **Archived section** (append at bottom if anything is archived):
   ```markdown
   ## Archived
   <!-- Entries that are no longer relevant to active work -->
   - [Patterns] {compressed one-liner of original entry}
   - [Decisions] {compressed one-liner of original entry}
   ```
</step>

<step name="present_diff">
**Show the user the compression**

Display:

```
LESSONS.md compaction

Before: {N} lines / {K} characters
After:  {N} lines / {K} characters
Reduction: {X}%

Changes:
- Merged {N} duplicate entries
- Compressed {N} verbose entries
- Archived {N} obsolete entries

--- Patterns ---
{new content}

--- Pitfalls ---
{new content}

--- Decisions ---
{new content}

{--- Archived --- (if any)}
{archived content}
```

Use `AskUserQuestion`:
- **Apply** — write the compressed LESSONS.md
- **Edit first** — show each changed entry and let the user adjust
- **Cancel** — leave LESSONS.md unchanged
</step>

<step name="write">
**Write the compressed file**

If the user approves, write the new LESSONS.md.

Display:
```
LESSONS.md compacted: {before} → {after} characters ({X}% reduction)
```
</step>

</process>

<success_criteria>
- [ ] LESSONS.md read and analyzed
- [ ] Compression only happens if file is substantive (>2000 chars)
- [ ] Duplicates merged, verbose entries condensed, obsolete entries archived
- [ ] No meaningful signal lost (pitfalls and active decisions preserved)
- [ ] User shown before/after and approves before write
- [ ] Final character count reported
</success_criteria>
