# Testing and Bulletproofing Skills

Reference material for testing skills and bulletproofing discipline-enforcing skills against rationalization.

## Testing by Skill Type

### Discipline-Enforcing Skills (rules/requirements)

**Examples:** TDD, verification-before-completion, designing-before-coding

**Test with:** Academic questions, pressure scenarios, combined pressures (time + sunk cost + exhaustion). Identify rationalizations and add explicit counters.

**Success criteria:** Agent follows rule under maximum pressure.

### Technique Skills (how-to guides)

**Examples:** condition-based-waiting, root-cause-tracing, defensive-programming

**Test with:** Application scenarios, variation/edge cases, missing information tests.

**Success criteria:** Agent successfully applies technique to new scenario.

### Pattern Skills (mental models)

**Examples:** reducing-complexity, information-hiding concepts

**Test with:** Recognition scenarios, application scenarios, counter-examples (when NOT to apply).

**Success criteria:** Agent correctly identifies when/how to apply pattern.

### Reference Skills (documentation/APIs)

**Examples:** API documentation, command references, library guides

**Test with:** Retrieval scenarios, application scenarios, gap testing.

**Success criteria:** Agent finds and correctly applies reference information.

## Common Rationalizations for Skipping Testing

| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to you ≠ clear to other agents. Test it. |
| "It's just a reference" | References can have gaps. Test retrieval. |
| "Testing is overkill" | Untested skills have issues. Always. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Too tedious to test" | Less tedious than debugging bad skill in production. |
| "I'm confident it's good" | Overconfidence guarantees issues. Test anyway. |
| "Academic review is enough" | Reading ≠ using. Test application scenarios. |
| "No time to test" | Deploying untested skill wastes more time later. |

**All of these mean: Test before deploying. No exceptions.**

## Bulletproofing Discipline Skills

Skills that enforce discipline (like TDD) need to resist rationalization. Agents will find loopholes under pressure.

**Psychology note:** See persuasion-principles.md for research foundation (Cialdini, 2021; Meincke et al., 2025).

### Close Every Loophole Explicitly

Don't just state the rule - forbid specific workarounds:

```markdown
Write code before test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

### Address "Spirit vs Letter" Arguments

Add early: `**Violating the letter of the rules is violating the spirit of the rules.**`

This cuts off the entire class of "I'm following the spirit" rationalizations.

### Build Rationalization Table

Capture rationalizations from baseline testing. Every excuse agents make goes in the table.

### Create Red Flags List

Make it easy for agents to self-check:

```markdown
## Red Flags - STOP and Start Over
- Code before test
- "I already manually tested it"
- "This is different because..."

**All of these mean: Delete code. Start over.**
```

### Update CSO for Violation Symptoms

Add triggering conditions to description for when agent is ABOUT to violate the rule.

## RED-GREEN-REFACTOR for Skills

### RED: Write Failing Test (Baseline)

Run pressure scenario with subagent WITHOUT the skill. Document:
- What choices did they make?
- What rationalizations did they use (verbatim)?
- Which pressures triggered violations?

### GREEN: Write Minimal Skill

Write skill addressing those specific rationalizations. Don't add extra content for hypothetical cases. Run same scenarios WITH skill - agent should now comply.

### REFACTOR: Close Loopholes

Agent found new rationalization? Add explicit counter. Re-test until bulletproof.

**Full testing methodology:** See @testing-skills-with-subagents.md for pressure scenario writing, pressure types, and meta-testing techniques.
