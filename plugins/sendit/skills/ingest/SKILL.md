---
name: sendit:ingest
description: Import a spec from external sources — FEATURE.md, PRDs, JIRA descriptions, or any document
argument-hint: "<file-path or URL description>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - WebFetch
  - AskUserQuestion
---

# Spec Ingestion

Convert external documents into sendit SPEC.md format.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md

<process>
<step name="identify-source">

### 1. Identify Source

Determine what the user is providing:

| Source | How to detect | Approach |
|--------|-------------|----------|
| Local file | Path provided | Read the file directly |
| URL | Starts with http | Fetch with WebFetch |
| Pasted text | Inline in message | Use the text directly |
| JIRA reference | Contains JIRA ID pattern | Ask user to paste the description |

</step>

<step name="extract-content">

### 2. Extract Content

Read/fetch the source material and identify:

- **Feature name**: What is this about? (becomes the spec directory name)
- **Context/motivation**: Why does this exist?
- **Requirements**: What must be built? Separate into Must/Should/Won't Have
- **Acceptance criteria**: Any testable conditions mentioned
- **Design decisions**: Any architectural choices stated or implied
- **Open questions**: Anything ambiguous or undefined

</step>

<step name="create-spec">

### 3. Create Spec

1. Determine spec name: kebab-case from feature name
   - Ask user to confirm: "I'll create this as `specs/{name}/SPEC.md`. Good?"

2. Create the spec directory and SPEC.md:
   - Map extracted content to spec format sections
   - Anything ambiguous → OPEN section
   - Missing acceptance criteria → add OPEN item "Define acceptance criteria"
   - Set status to DRAFT (ingested specs always start as DRAFT)

3. Show the user the created spec for review

4. Ensure `specs/INDEX.md` exists and add the new entry

</step>

<step name="refine">

### 4. Offer Refinement

After creation:
> "Spec created as DRAFT. Want to refine it now? I can help fill in gaps and resolve OPEN items."

If yes → transition to spec engagement workflow.
If no → done.

</step>
</process>

## Notes

- Ingested specs always start as DRAFT — they need human review
- The OPEN section captures everything that wasn't clear in the source
- Don't invent requirements — if the source doesn't specify something, make it an OPEN item
- Preserve the source's intent, don't over-formalize informal language
