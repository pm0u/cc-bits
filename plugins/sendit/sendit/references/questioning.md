# Questioning Guide

Targeted questioning for complex new specs. Not always-on — triggered when creating a new spec for a non-trivial feature.

## When to Question

Question when ALL of these are true:
- Creating a new spec (spec-on-touch or explicit `/sendit:spec create`)
- Task is non-trivial (full weight, or multi-spec scope)
- No existing spec covers this area

Skip questioning when:
- Editing an existing spec (just resolve OPEN items)
- Task is a bug fix or small change
- User provided detailed requirements already (e.g., via `/sendit:ingest`)

## Philosophy

You are a thinking partner helping the user sharpen a fuzzy idea into a concrete spec. Don't interrogate — collaborate. Don't follow a script — follow the thread.

The goal: enough clarity to write a SPEC.md that the planner and executor can act on without guessing.

## What You Need

By the end of questioning, the spec must have:

1. **Concrete behavior** — what happens when a user does X
2. **Scope boundaries** — what's explicitly NOT in this version
3. **Key decisions** — choices that affect implementation (not implementation details themselves)
4. **Success criteria** — how you know it works (becomes acceptance criteria)

## How to Question

**Start with what they gave you.** Parse the task description. Identify what's clear and what's fuzzy.

**Surface the fuzzy parts.** Don't ask about things they've already specified. Focus on gaps.

**Make the abstract concrete.** "Walk me through using this." "What does that actually look like?" "Give me an example."

**Clarify ambiguity.** "When you say X, do you mean A or B?" Present concrete options, not open-ended questions.

**Probe scope.** "Is Y in scope for this version?" "What happens if Z fails?" Complex features always have hidden scope.

**Know when to stop.** When you can write a clear spec without guessing, offer to proceed. Don't question for the sake of questioning.

## Using AskUserQuestion

Present concrete options to react to — don't ask open-ended questions.

**Good options:**
- Interpretations of what they might mean
- Specific examples to confirm or deny
- Concrete choices that reveal priorities

**Bad options:**
- Generic categories ("Technical", "Business", "Other")
- Leading options that presume an answer
- Too many options (2-4 is ideal)

**Example — vague scope:**
User says "add a settings page"

- header: "Settings"
- question: "What can users configure?"
- options: ["Profile info only", "Profile + notifications", "Full preferences (theme, language, etc.)", "Let me explain"]

**Example — implicit decision:**
User says "show a list of items"

- header: "List UX"
- question: "How should large lists work?"
- options: ["Pagination (page 1, 2, 3...)", "Infinite scroll", "Load more button", "Let me explain"]

## Probing Depth

- Ask 2-4 questions per fuzzy area
- After each area: "Anything else about {area}, or move on?"
- When all areas covered: "I think I have enough to write the spec. Ready?"
- If user says "just do it" at any point: stop questioning, write spec with best guesses, mark unknowns as OPEN items

## Anti-Patterns

- **Checklist walking** — asking about every section regardless of relevance
- **Interrogation** — rapid-fire questions without building on answers
- **Shallow acceptance** — taking vague answers ("it should be good") without probing
- **Premature implementation** — asking about tech stack, architecture, or code patterns (those are Claude's decisions)
- **Scope inflation** — suggesting features the user didn't ask for
- **Blocking on perfection** — questioning endlessly when 80% clarity is enough to write a spec with OPEN items for the rest
