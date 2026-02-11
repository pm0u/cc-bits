# cc-bits

A collection of Claude Code plugins for agentic development workflows.

## Plugins

### [SHIPIT](./plugins/shipit/README.md)

Agentic development orchestration for Claude Code. Creates hierarchical project plans optimized for solo agentic development with persistent state, parallel execution, and goal-backward verification. Handles the full lifecycle: project discovery, roadmap generation, phase planning, parallel execution, and cross-phase learning.

### [Spek](./plugins/spek/README.md)

Spec-driven development with triangle enforcement (SPEC <-> tests <-> code). Combines interactive spec creation with SHIPIT's orchestration engine and automatic triangle validation. Ensures your implementation matches your specification through active enforcement, not just documentation.

### [Statusline](./plugins/statusline/)

Enhanced statusline for Claude Code showing model, directory, context usage, and API rate limits.

## Installation

```bash
# Add the marketplace
claude plugin marketplace add pm0u/cc-bits

# Install a plugin
claude plugin install shipit@pm0u-cc-bits
claude plugin install spek@pm0u-cc-bits
claude plugin install statusline@pm0u-cc-bits
```

## License

MIT
