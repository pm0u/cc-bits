# Write Tests Workflow

Orchestrates the test-writer agent to derive failing tests from the spec.

## Input

- `spec_path`: Path to the SPEC.md that was created or changed
- `weight`: light | full

## Process

### Light Mode

In light mode, test writing is deferred to the executor. Tests are written alongside implementation. Skip this workflow entirely.

### Full Mode

<step name="spawn-test-writer">

1. Spawn the test-writer agent:
   ```
   Task(subagent_type="test-writer", prompt="
     SPEC: {spec_path}

     Read the spec and write failing tests for all acceptance criteria.
     Follow the project's existing testing conventions.
     Return the list of test files created and criteria coverage.
   ")
   ```

2. Process the result:
   - Verify test files were created
   - Check criteria coverage — flag any uncovered criteria
   - Verify tests are actually failing (not passing)

3. If criteria are uncovered:
   - Report to user: "{N} acceptance criteria couldn't be directly tested: {list}"
   - These will need manual verification during post-flight

</step>

## Output

```markdown
**Tests written**: {yes | deferred-to-executor}
**Test files**: {list of paths}
**Criteria covered**: {N}/{total}
**Tests failing**: {yes | some-pass (investigate)}
```

Proceed to: @~/.claude/plugins/marketplaces/sendit/sendit/workflows/plan.md
