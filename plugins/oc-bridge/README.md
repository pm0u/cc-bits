# OC Bridge

Bridge an existing Claude Code setup into OpenCode without duplicating skills, agents, commands, or plugin content.

## Installation

```bash
claude plugin install oc-bridge@pm0u-cc-bits
```

## Included Skills

- `oc-bridge:migrate` - Inventory Claude assets and apply the wrapper/symlink migration playbook for OpenCode.

## What It Covers

- Project-level Claude assets in `.claude/`
- User-level Claude assets in `~/.claude/`
- OpenCode discovery paths in `.opencode/` and `~/.config/opencode/`
- Claude marketplace plugin assets cached under `~/.claude/plugins/cache/`

## Notes

- The workflow keeps Claude assets as the source of truth.
- OpenCode reuses them through symlinks for skills and wrappers for commands and agents.
- This plugin documents the migration path; it does not assume OpenCode has a matching marketplace install path.
