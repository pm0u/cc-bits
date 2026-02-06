# Installing Huckit for Codex

Enable huckit skills in Codex via native skill discovery. Just clone and symlink.

## Prerequisites

- Git

## Installation

1. **Clone the huckit repository:**
   ```bash
   git clone https://github.com/pm0u/cc-bits.git ~/.codex/huckit
   ```

2. **Create the skills symlink:**
   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/huckit/skills ~/.agents/skills/huckit
   ```

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\huckit" "$env:USERPROFILE\.codex\huckit\skills"
   ```

3. **Restart Codex** (quit and relaunch the CLI) to discover the skills.

## Migrating from old bootstrap

If you installed huckit before native skill discovery, you need to:

1. **Update the repo:**
   ```bash
   cd ~/.codex/huckit && git pull
   ```

2. **Create the skills symlink** (step 2 above) — this is the new discovery mechanism.

3. **Remove the old bootstrap block** from `~/.codex/AGENTS.md` — any block referencing `huckit-codex bootstrap` is no longer needed.

4. **Restart Codex.**

## Verify

```bash
ls -la ~/.agents/skills/huckit
```

You should see a symlink (or junction on Windows) pointing to your huckit skills directory.

## Updating

```bash
cd ~/.codex/huckit && git pull
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/huckit
```

Optionally delete the clone: `rm -rf ~/.codex/huckit`.
