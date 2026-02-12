---
name: spek:discuss-phase
description: Gather phase context through adaptive questioning before planning
argument-hint: "<phase>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Extract implementation decisions that downstream agents need — researcher and planner will use CONTEXT.md to know what to investigate and what choices are locked.

**How it works:**
1. Analyze the phase to identify gray areas (UI, UX, behavior, etc.)
2. Present gray areas — user selects which to discuss
3. Deep-dive each selected area until satisfied
4. Create CONTEXT.md with decisions that guide research and planning

**Output:** `{phase}-CONTEXT.md` — decisions clear enough that downstream agents can act without asking the user again
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/spek/workflows/discuss-phase.md
@${CLAUDE_PLUGIN_ROOT}/spek/templates/context.md
</execution_context>

<context>
Phase number: $ARGUMENTS (required)

**Load project state:**
@.planning/STATE.md

**Load roadmap:**
@.planning/ROADMAP.md
</context>

<process>

### 1. Validate Phase Number

Check that phase exists in ROADMAP.md. Error if missing or invalid.

### 2. Check for Existing CONTEXT.md

If `{phase}-CONTEXT.md` exists:

**Use AskUserQuestion:**
- header: "Existing context"
- question: "Context file exists for Phase {N}. What do you want to do?"
- options:
  - "Update it" — Re-discuss and update (Recommended)
  - "View it first" — Show me what's there
  - "Skip" — Use existing context

### 3. Analyze Phase & Identify Gray Areas

Identify domain and generate 3-4 phase-specific gray areas (not generic categories).

### 4. Present Gray Areas (Multi-Select)

**Use AskUserQuestion:**
- header: "Gray areas"
- question: "Which areas do you want to discuss for Phase {N}?"
- multiSelect: true
- options:
  - "{area_1}" — {why it matters}
  - "{area_2}" — {why it matters}
  - "{area_3}" — {why it matters}
  - "{area_4}" — {why it matters}

NO "Skip all" option - user invoked this command to discuss.

### 5. Deep-Dive Each Selected Area

For each selected area, ask 4 questions with concrete options.

After 4 questions:

**Use AskUserQuestion:**
- header: "Continue?"
- question: "More questions about {area}, or move to next?"
- options:
  - "Move to next area" — Continue (Recommended)
  - "Ask 4 more questions" — I need more clarity

### 6. Write CONTEXT.md

Create `{phase}-CONTEXT.md` with sections matching discussed areas.

### 7. Offer Next Steps

**Use AskUserQuestion:**
- header: "Next step"
- question: "How do you want to proceed?"
- options:
  - "Plan this phase" — Run /spek:plan-phase {N} (Recommended)
  - "Research first" — Need to investigate unknowns
  - "I'll review" — Stop here

**CRITICAL: Scope guardrail**
- Phase boundary from ROADMAP.md is FIXED
- Discussion clarifies HOW to implement, not WHETHER to add more
- If user suggests new capabilities: "That's its own phase. I'll note it for later."
- Capture deferred ideas — don't lose them, don't act on them

**Domain-aware gray areas:**
Gray areas depend on what's being built. Analyze the phase goal:
- Something users SEE → layout, density, interactions, states
- Something users CALL → responses, errors, auth, versioning
- Something users RUN → output format, flags, modes, error handling
- Something users READ → structure, tone, depth, flow
- Something being ORGANIZED → criteria, grouping, naming, exceptions

Generate 3-4 **phase-specific** gray areas, not generic categories.

**Probing depth:**
- Ask 4 questions per area before checking
- "More questions about [area], or move to next?"
- If more → ask 4 more, check again
- After all areas → "Ready to create context?"

**Do NOT ask about (Claude handles these):**
- Technical implementation
- Architecture choices
- Performance concerns
- Scope expansion
</process>

<success_criteria>
- Gray areas identified through intelligent analysis
- User chose which areas to discuss
- Each selected area explored until satisfied
- Scope creep redirected to deferred ideas
- CONTEXT.md captures decisions, not vague vision
- User knows next steps
</success_criteria>
