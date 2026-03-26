---
name: migrate
description: Migrate Claude Code skills, commands, agents, and plugins into OpenCode using wrappers and symlinks
---

Run the OpenCode migration workflow for this Claude Code setup.

Use the playbook at `@claude_migration_playbook.md` as the source of truth for the migration steps.

Workflow:

1. Inventory Claude assets at project scope (`.claude/`) and user scope (`~/.claude/`).
2. Compare them against OpenCode discovery paths in `.opencode/` and `~/.config/opencode/`.
3. Propose wrappers and symlinks so Claude remains the source of truth.
4. Ask for confirmation before making filesystem changes.
5. If approved, apply the migration carefully and report:
   - assets discovered
   - wrappers and symlinks created
   - plugin inventory found in `~/.claude/plugins/cache/`
   - any follow-up actions or manual fixes still needed

Inputs to gather if missing:

- repo root path
- scope: project, user, or both
- whether to include marketplace plugin assets
- whether to prefer wrappers vs direct edits where both are possible
