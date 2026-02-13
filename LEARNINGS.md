# Agentic Development Learnings

Insights from building and using agentic coding workflows across this marketplace. Gathered from hands-on experience with SPEK, SHIPIT, and Vision Quest, plus community reports.

## The Core Problem

Multi-phase pipelines (research → plan → plan-check → execute → verify → enforce) front-load ceremony and each handoff between agents loses context. By the time the executor is writing code, it's working from a plan that's already an abstraction of an abstraction of what was actually wanted.

Common failure modes:

1. **Goal dilution** — Intent gets translated through spec → roadmap → phase → plan → tasks. Each layer is lossy compression. The executor faithfully completes tasks but misses the point.
2. **Plan rigidity** — Reality diverges from the plan 5 minutes into coding. Structured workflows don't adapt well mid-execution.
3. **Context fragmentation** — Each sub-agent starts with limited context. The planner doesn't know what the executor will discover. The executor doesn't know *why* certain decisions were made.
4. **Overhead vs. value** — For many tasks, planning/verification overhead exceeds the value it provides.

## What Gets Passed to the Delegate Matters Most

The central insight: **distilling intent into procedural steps is the most lossy format possible.** It strips out the WHY and assumes the planner can predict every HOW in advance. When reality diverges, the executor has no compass.

What should travel with each work unit instead:

- **The goal** — what done looks like, not how to get there
- **Acceptance criteria** — concrete, testable conditions
- **Constraints** — patterns to follow, things to avoid, architectural boundaries
- **Relevant code context** — not the whole codebase, but the specific files/patterns that matter

Then let the executor figure out the HOW. That's what it's good at — reading code and solving problems. What it's bad at is intuiting *intent* from a task checklist.

## Sub-Agents vs Agent Teams

**Sub-agents + single orchestrator is the better fit for iterative work.** Agent teams solve a problem most workflows don't have (inter-agent communication during execution). For a "pick goal → execute → reconcile" model, the executor doesn't need to talk to a peer mid-task — it needs to report back to the orchestrator when done. Sub-agents already do that.

Community data on agent teams:

- **Token cost is brutal** — 3-4x a single session. One analysis estimated 22-44% of total project cost is "confusion tax" from coordination overhead.
- **File conflicts** are the #1 practical problem. Two agents touching the same file = overwrites.
- **Context bootstrapping is expensive** — each agent burns 15-50k tokens just orienting itself.
- **~95% of agent-assisted development tasks don't need multi-agent setups** (community estimate).
- An ERP system build attempted with agent teams collapsed completely — 100K+ tokens consumed with incomplete deliverables. Agents couldn't remember prior decisions without explicit re-briefing.

Where agent teams DO help: parallel *independent* work (review from multiple angles, research different hypotheses) where file boundaries are clear.

## The TDD Triangle Belongs Inside Execution

Separating test-writing, implementation, and verification into different agents creates drift between what the spec says, what the tests check, and what the code does.

Embedding all three in one executor context eliminates this:

```
Acceptance Criteria (spec)
        ↕ derived from
Failing Tests (written first)
        ↕ satisfied by
Implementation (code)
```

The orchestrator does a lightweight sanity check in reconciliation (do the tests actually map to the criteria?) rather than running separate verifier/spec-enforcer agents.

As one analysis put it: "Task verification quality is the bottleneck. It's important that the task verifier is nearly perfect, otherwise Claude will solve the wrong problem." If the tests (derived from acceptance criteria) are right, the executor can't drift far from the goal.

## Bidirectional Reconciliation Prevents Goal Drift

Forward-only learning (executor reads lessons but can't suggest changes) leads to stale plans. Bidirectional reconciliation means:

- Learnings flow UP — executor reports patterns, pitfalls, and decisions
- Goals get ADJUSTED — executor can suggest changes to upcoming goals based on what it discovered
- Vision stays current — the orchestrator updates the living vision doc after each goal

This prevents the "plan was wrong but we executed it anyway" failure mode.

## Token Efficiency Principles

1. **Don't create reference files with a single consumer.** If only one skill reads a protocol doc, inline it. Separate references only pay for themselves when multiple consumers share them. During Vision Quest development, consolidating three reference files into the main skill cut orchestrator context by 53%.

2. **Paste context, don't reference it.** Sub-agents don't have access to `@` file references or conversation history. Everything they need must be in the prompt. This is more explicit and avoids the failure mode where a reference path doesn't resolve.

3. **Compressed state > full history.** A living vision doc that's always updated to reflect current state beats retaining full executor returns in active context. Completed goals become one-liners. Only keep what's actionable for future goals. Cold storage (HISTORY.md) exists for auditing but is never loaded during execution.

4. **Less ceremony = fewer tokens.** `read goal → execute → reconcile` burns fewer tokens than `research → plan → check → execute → verify → enforce`, and in practice produces comparable or better results because the executor gets higher-quality context.

## When to Use What

| Scenario | Approach |
|----------|----------|
| Single feature or bug fix | Stay in one context, no framework needed |
| Multi-goal project, sequential | Goal-driven workflow (Vision Quest model) |
| Large project, clear layer boundaries | Agent teams with delegate mode (if budget allows) |
| Research or exploration | Sub-agents in parallel, synthesize results |
