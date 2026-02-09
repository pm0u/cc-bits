---
name: flow:set-profile
description: Switch model profile for Flow agents (quality/balanced/budget)
arguments:
  - name: profile
    description: "Profile name: quality, balanced, or budget"
    required: true
allowed-tools:
  - Read
  - Write
  - Bash
---

# Flow: Set Profile

Switch the model profile used by Flow agents. Controls which Claude model each agent uses, balancing quality vs token spend.

## References

@~/.claude/plugins/marketplaces/flow/flow/references/model-profiles.md

## Profiles

| Profile | Description |
|---------|-------------|
| **quality** | Opus for planner/executor, Sonnet for verifier |
| **balanced** | Opus for planner, Sonnet for executor/verifier (default) |
| **budget** | Sonnet for all writing, Haiku for research/verification |

## Process

<process>

### 1. Validate Argument

```bash
PROFILE="$1"

if [[ ! "$PROFILE" =~ ^(quality|balanced|budget)$ ]]; then
  echo "Error: Invalid profile '$PROFILE'"
  echo ""
  echo "Valid profiles:"
  echo "  - quality  (Opus for planning and execution)"
  echo "  - balanced (Opus planning, Sonnet execution - default)"
  echo "  - budget   (Sonnet execution, Haiku research)"
  exit 1
fi
```

### 2. Ensure Config Directory Exists

```bash
# Create specs/.flow/ directory if it doesn't exist
if [ ! -d "specs/.flow" ]; then
  mkdir -p "specs/.flow"
  echo "Created specs/.flow/ directory"
fi
```

### 3. Update Config File

```bash
CONFIG_FILE="specs/.flow/config.json"

# Read current config (if exists)
if [ -f "$CONFIG_FILE" ]; then
  CURRENT_CONFIG=$(cat "$CONFIG_FILE")
else
  CURRENT_CONFIG="{}"
fi

# Update model_profile field
UPDATED_CONFIG=$(echo "$CURRENT_CONFIG" | jq --arg profile "$PROFILE" '.model_profile = $profile')

# Write back
echo "$UPDATED_CONFIG" > "$CONFIG_FILE"

echo "✓ Model profile set to: $PROFILE"
echo ""
```

### 4. Show Profile Details

```bash
echo "Agents will now use:"
echo ""

case "$PROFILE" in
  quality)
    echo "| Agent          | Model  |"
    echo "|----------------|--------|"
    echo "| flow:planner   | opus   |"
    echo "| flow:executor  | opus   |"
    echo "| flow:researcher| opus   |"
    echo "| flow:verifier  | sonnet |"
    ;;
  balanced)
    echo "| Agent          | Model  |"
    echo "|----------------|--------|"
    echo "| flow:planner   | opus   |"
    echo "| flow:executor  | sonnet |"
    echo "| flow:researcher| sonnet |"
    echo "| flow:verifier  | sonnet |"
    ;;
  budget)
    echo "| Agent          | Model  |"
    echo "|----------------|--------|"
    echo "| flow:planner   | sonnet |"
    echo "| flow:executor  | sonnet |"
    echo "| flow:researcher| haiku  |"
    echo "| flow:verifier  | haiku  |"
    ;;
esac

echo ""
echo "Next spawned agents will use the new profile."
```

### 5. Commit Config (If Git Repo)

```bash
if git rev-parse --git-dir > /dev/null 2>&1; then
  git add "$CONFIG_FILE"
  git commit -m "config(flow): set model profile to $PROFILE" 2>/dev/null || true
fi
```

</process>

## Examples

**Switch to budget mode:**
```
/flow:set-profile budget

✓ Model profile set to: budget

Agents will now use:
| Agent          | Model  |
|----------------|--------|
| flow:planner   | sonnet |
| flow:executor  | sonnet |
| flow:researcher| haiku  |
| flow:verifier  | haiku  |

Next spawned agents will use the new profile.
```

**Switch to quality mode:**
```
/flow:set-profile quality

✓ Model profile set to: quality

Agents will now use:
| Agent          | Model  |
|----------------|--------|
| flow:planner   | opus   |
| flow:executor  | opus   |
| flow:researcher| opus   |
| flow:verifier  | sonnet |

Next spawned agents will use the new profile.
```

**Switch to balanced (default):**
```
/flow:set-profile balanced

✓ Model profile set to: balanced

Agents will now use:
| Agent          | Model  |
|----------------|--------|
| flow:planner   | opus   |
| flow:executor  | sonnet |
| flow:researcher| sonnet |
| flow:verifier  | sonnet |

Next spawned agents will use the new profile.
```
