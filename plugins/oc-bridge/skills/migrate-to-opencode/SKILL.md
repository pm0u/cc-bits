---
name: oc-bridge:migrate
description: Analyze Claude Code commands, agents, skills, and plugins at project or user scope and apply the OpenCode migration playbook via wrappers and symlinks
---

## What I do
- Inventory Claude Code commands, agents, skills, and plugins at both project and user levels
- Compare them against OpenCode discovery paths
- Create wrappers or symlinks following the migration playbook
- Report what changed and what still needs follow-up

## When to use me
Use this skill when you want OpenCode to reuse existing Claude Code assets without manual setup.
Ask for confirmation before making filesystem changes.

## Playbook reference
@claude_migration_playbook.md

## Inputs I expect
- Repo root path
- Whether to operate project-level, user-level, or both
- Whether to use wrappers vs direct edits
- Whether to include plugins in migration (default: true)
  - Discovers plugin commands, agents, and skills from `~/.claude/plugins/cache/`

## Outputs I produce
- A checklist of assets discovered (commands, agents, skills, plugins)
- A list of wrappers or symlinks created
- Plugin inventory with marketplace sources
- Any follow-up actions needed

## Plugin Discovery
This skill also discovers Claude Code plugins installed from the marketplace:
- Parses `~/.claude/plugins/installed_plugins.json` for installed plugins
- Discovers plugin assets in `~/.claude/plugins/cache/<publisher>/<plugin>/<version>/`
- Supports plugin commands in `commands/` subdirectory
- Supports plugin agents in `agents/` subdirectory
- Supports plugin skills in `skills/` subdirectory
- Marketplace plugins from `claude-plugins-official` and `cc-bits` publishers

## Usage Example
When running this skill, specify:

```yaml
repo_root: /path/to/repo
scope: both
include_plugins: true
```
