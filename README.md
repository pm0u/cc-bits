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

Install individual plugins or the full marketplace:

```bash
# Full marketplace
claude mcp add-from-claude-plugin https://github.com/pm0u/cc-bits

# Individual plugin
claude mcp add-from-claude-plugin https://github.com/pm0u/cc-bits/plugins/shipit
```

## License

MIT
