# Verification Patterns

How to verify different types of artifacts are real implementations, not stubs or placeholders.

<core_principle>
**Existence ≠ Implementation**

A file existing does not mean the feature works. Verification must check:
1. **Exists** - File is present at expected path
2. **Substantive** - Content is real implementation, not placeholder
3. **Wired** - Connected to the rest of the system
4. **Functional** - Actually works when invoked

Levels 1-3 can be checked programmatically. Level 4 often requires human verification.
</core_principle>

<stub_detection>

## Universal Stub Patterns

These patterns indicate placeholder code regardless of file type:

**Comment-based stubs:**
```bash
# Grep patterns for stub comments
grep -E "(TODO|FIXME|XXX|HACK|PLACEHOLDER)" "$file"
grep -E "implement|add later|coming soon|will be" "$file" -i
grep -E "// \.\.\.|/\* \.\.\. \*/|# \.\.\." "$file"
```

**Placeholder text in output:**
```bash
# UI placeholder patterns
grep -E "placeholder|lorem ipsum|coming soon|under construction" "$file" -i
grep -E "sample|example|test data|dummy" "$file" -i
grep -E "\[.*\]|<.*>|\{.*\}" "$file"  # Template brackets left in
```

**Empty or trivial implementations:**
```bash
# Functions that do nothing
grep -E "return null|return undefined|return \{\}|return \[\]" "$file"
grep -E "pass$|\.\.\.|\bnothing\b" "$file"
grep -E "console\.(log|warn|error).*only" "$file"  # Log-only functions
```

**Hardcoded values where dynamic expected:**
```bash
# Hardcoded IDs, counts, or content
grep -E "id.*=.*['\"].*['\"]" "$file"  # Hardcoded string IDs
grep -E "count.*=.*\d+|length.*=.*\d+" "$file"  # Hardcoded counts
grep -E "\\\$\d+\.\d{2}|\d+ items" "$file"  # Hardcoded display values
```

</stub_detection>

<react_components>

## React/Next.js Components

**Existence check:**
```bash
# File exists and exports component
[ -f "$component_path" ] && grep -E "export (default |)function|export const.*=.*\(" "$component_path"
```

**Substantive check:**
```bash
# Returns actual JSX, not placeholder
grep -E "return.*<" "$component_path" | grep -v "return.*null" | grep -v "placeholder" -i

# Has meaningful content (not just wrapper div)
grep -E "<[A-Z][a-zA-Z]+|className=|onClick=|onChange=" "$component_path"

# Uses props or state (not static)
grep -E "props\.|useState|useEffect|useContext|\{.*\}" "$component_path"
```

**Stub patterns specific to React:**
```javascript
// RED FLAGS - These are stubs:
return <div>Component</div>
return <div>Placeholder</div>
return <div>{/* TODO */}</div>
return <p>Coming soon</p>
return null
return <></>

// Also stubs - empty handlers:
onClick={() => {}}
onChange={() => console.log('clicked')}
onSubmit={(e) => e.preventDefault()}  // Only prevents default, does nothing
```

**Wiring check:**
```bash
# Component imports what it needs
grep -E "^import.*from" "$component_path"

# Props are actually used (not just received)
# Look for destructuring or props.X usage
grep -E "\{ .* \}.*props|\bprops\.[a-zA-Z]+" "$component_path"

# API calls exist (for data-fetching components)
grep -E "fetch\(|axios\.|useSWR|useQuery|getServerSideProps|getStaticProps" "$component_path"
```

**Functional verification (human required):**
- Does the component render visible content?
- Do interactive elements respond to clicks?
- Does data load and display?
- Do error states show appropriately?

</react_components>

<api_routes>

## API Routes (Next.js App Router / Express / etc.)

**Existence check:**
```bash
# Route file exists
[ -f "$route_path" ]

# Exports HTTP method handlers (Next.js App Router)
grep -E "export (async )?(function|const) (GET|POST|PUT|PATCH|DELETE)" "$route_path"

# Or Express-style handlers
grep -E "\.(get|post|put|patch|delete)\(" "$route_path"
```

**Substantive check:**
```bash
# Has actual logic, not just return statement
wc -l "$route_path"  # More than 10-15 lines suggests real implementation

# Interacts with data source
grep -E "prisma\.|db\.|mongoose\.|sql|query|find|create|update|delete" "$route_path" -i

# Has error handling
grep -E "try|catch|throw|error|Error" "$route_path"

# Returns meaningful response
grep -E "Response\.json|res\.json|res\.send|return.*\{" "$route_path" | grep -v "message.*not implemented" -i
```

**Stub patterns specific to API routes:**
```typescript
// RED FLAGS - These are stubs:
export async function POST() {
  return Response.json({ message: "Not implemented" })
}

export async function GET() {
  return Response.json([])  // Empty array with no DB query
}

export async function PUT() {
  return new Response()  // Empty response
}

// Console log only:
export async function POST(req) {
  console.log(await req.json())
  return Response.json({ ok: true })
}
```

**Wiring check:**
```bash
# Imports database/service clients
grep -E "^import.*prisma|^import.*db|^import.*client" "$route_path"

# Actually uses request body (for POST/PUT)
grep -E "req\.json\(\)|req\.body|request\.json\(\)" "$route_path"

# Validates input (not just trusting request)
grep -E "schema\.parse|validate|zod|yup|joi" "$route_path"
```

**Functional verification (human or automated):**
- Does GET return real data from database?
- Does POST actually create a record?
- Does error response have correct status code?
- Are auth checks actually enforced?

</api_routes>

<database_schema>

## Database Schema (Prisma / Drizzle / SQL)

**Existence check:**
```bash
# Schema file exists
[ -f "prisma/schema.prisma" ] || [ -f "drizzle/schema.ts" ] || [ -f "src/db/schema.sql" ]

# Model/table is defined
grep -E "^model $model_name|CREATE TABLE $table_name|export const $table_name" "$schema_path"
```

**Substantive check:**
```bash
# Has expected fields (not just id)
grep -A 20 "model $model_name" "$schema_path" | grep -E "^\s+\w+\s+\w+"

# Has relationships if expected
grep -E "@relation|REFERENCES|FOREIGN KEY" "$schema_path"

# Has appropriate field types (not all String)
grep -A 20 "model $model_name" "$schema_path" | grep -E "Int|DateTime|Boolean|Float|Decimal|Json"
```

**Stub patterns specific to schemas:**
```prisma
// RED FLAGS - These are stubs:
model User {
  id String @id
  // TODO: add fields
}

model Message {
  id        String @id
  content   String  // Only one real field
}

// Missing critical fields:
model Order {
  id     String @id
  // No: userId, items, total, status, createdAt
}
```

**Wiring check:**
```bash
# Migrations exist and are applied
ls prisma/migrations/ 2>/dev/null | wc -l  # Should be > 0
npx prisma migrate status 2>/dev/null | grep -v "pending"

# Client is generated
[ -d "node_modules/.prisma/client" ]
```

**Functional verification:**
```bash
# Can query the table (automated)
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM $table_name"
```

</database_schema>

<hooks_utilities>

## Custom Hooks and Utilities

**Existence check:**
```bash
# File exists and exports function
[ -f "$hook_path" ] && grep -E "export (default )?(function|const)" "$hook_path"
```

**Substantive check:**
```bash
# Hook uses React hooks (for custom hooks)
grep -E "useState|useEffect|useCallback|useMemo|useRef|useContext" "$hook_path"

# Has meaningful return value
grep -E "return \{|return \[" "$hook_path"

# More than trivial length
[ $(wc -l < "$hook_path") -gt 10 ]
```

**Stub patterns specific to hooks:**
```typescript
// RED FLAGS - These are stubs:
export function useAuth() {
  return { user: null, login: () => {}, logout: () => {} }
}

export function useCart() {
  const [items, setItems] = useState([])
  return { items, addItem: () => console.log('add'), removeItem: () => {} }
}

// Hardcoded return:
export function useUser() {
  return { name: "Test User", email: "test@example.com" }
}
```

**Wiring check:**
```bash
# Hook is actually imported somewhere
grep -r "import.*$hook_name" src/ --include="*.tsx" --include="*.ts" | grep -v "$hook_path"

# Hook is actually called
grep -r "$hook_name()" src/ --include="*.tsx" --include="*.ts" | grep -v "$hook_path"
```

</hooks_utilities>

<environment_config>

## Environment Variables and Configuration

**Existence check:**
```bash
# .env file exists
[ -f ".env" ] || [ -f ".env.local" ]

# Required variable is defined
grep -E "^$VAR_NAME=" .env .env.local 2>/dev/null
```

**Substantive check:**
```bash
# Variable has actual value (not placeholder)
grep -E "^$VAR_NAME=.+" .env .env.local 2>/dev/null | grep -v "your-.*-here|xxx|placeholder|TODO" -i

# Value looks valid for type:
# - URLs should start with http
# - Keys should be long enough
# - Booleans should be true/false
```

**Stub patterns specific to env:**
```bash
# RED FLAGS - These are stubs:
DATABASE_URL=your-database-url-here
STRIPE_SECRET_KEY=sk_test_xxx
API_KEY=placeholder
NEXT_PUBLIC_API_URL=http://localhost:3000  # Still pointing to localhost in prod
```

**Wiring check:**
```bash
# Variable is actually used in code
grep -r "process\.env\.$VAR_NAME|env\.$VAR_NAME" src/ --include="*.ts" --include="*.tsx"

# Variable is in validation schema (if using zod/etc for env)
grep -E "$VAR_NAME" src/env.ts src/env.mjs 2>/dev/null
```

</environment_config>

<wiring_verification>

## Wiring Verification Patterns

Wiring verification checks that components actually communicate. This is where most stubs hide.

### Pattern: Component → API

**Check:** Does the component actually call the API?

```bash
# Find the fetch/axios call
grep -E "fetch\(['\"].*$api_path|axios\.(get|post).*$api_path" "$component_path"

# Verify it's not commented out
grep -E "fetch\(|axios\." "$component_path" | grep -v "^.*//.*fetch"

# Check the response is used
grep -E "await.*fetch|\.then\(|setData|setState" "$component_path"
```

**Red flags:**
```typescript
// Fetch exists but response ignored:
fetch('/api/messages')  // No await, no .then, no assignment

// Fetch in comment:
// fetch('/api/messages').then(r => r.json()).then(setMessages)

// Fetch to wrong endpoint:
fetch('/api/message')  // Typo - should be /api/messages
```

### Pattern: API → Database

**Check:** Does the API route actually query the database?

```bash
# Find the database call
grep -E "prisma\.$model|db\.query|Model\.find" "$route_path"

# Verify it's awaited
grep -E "await.*prisma|await.*db\." "$route_path"

# Check result is returned
grep -E "return.*json.*data|res\.json.*result" "$route_path"
```

**Red flags:**
```typescript
// Query exists but result not returned:
await prisma.message.findMany()
return Response.json({ ok: true })  // Returns static, not query result

// Query not awaited:
const messages = prisma.message.findMany()  // Missing await
return Response.json(messages)  // Returns Promise, not data
```

### Pattern: Form → Handler

**Check:** Does the form submission actually do something?

```bash
# Find onSubmit handler
grep -E "onSubmit=\{|handleSubmit" "$component_path"

# Check handler has content
grep -A 10 "onSubmit.*=" "$component_path" | grep -E "fetch|axios|mutate|dispatch"

# Verify not just preventDefault
grep -A 5 "onSubmit" "$component_path" | grep -v "only.*preventDefault" -i
```

**Red flags:**
```typescript
// Handler only prevents default:
onSubmit={(e) => e.preventDefault()}

// Handler only logs:
const handleSubmit = (data) => {
  console.log(data)
}

// Handler is empty:
onSubmit={() => {}}
```

### Pattern: State → Render

**Check:** Does the component render state, not hardcoded content?

```bash
# Find state usage in JSX
grep -E "\{.*messages.*\}|\{.*data.*\}|\{.*items.*\}" "$component_path"

# Check map/render of state
grep -E "\.map\(|\.filter\(|\.reduce\(" "$component_path"

# Verify dynamic content
grep -E "\{[a-zA-Z_]+\." "$component_path"  # Variable interpolation
```

**Red flags:**
```tsx
// Hardcoded instead of state:
return <div>
  <p>Message 1</p>
  <p>Message 2</p>
</div>

// State exists but not rendered:
const [messages, setMessages] = useState([])
return <div>No messages</div>  // Always shows "no messages"

// Wrong state rendered:
const [messages, setMessages] = useState([])
return <div>{otherData.map(...)}</div>  // Uses different data
```

</wiring_verification>

<verification_checklist>

## Quick Verification Checklist

For each artifact type, run through this checklist:

### Component Checklist
- [ ] File exists at expected path
- [ ] Exports a function/const component
- [ ] Returns JSX (not null/empty)
- [ ] No placeholder text in render
- [ ] Uses props or state (not static)
- [ ] Event handlers have real implementations
- [ ] Imports resolve correctly
- [ ] Used somewhere in the app

### API Route Checklist
- [ ] File exists at expected path
- [ ] Exports HTTP method handlers
- [ ] Handlers have more than 5 lines
- [ ] Queries database or service
- [ ] Returns meaningful response (not empty/placeholder)
- [ ] Has error handling
- [ ] Validates input
- [ ] Called from frontend

### Schema Checklist
- [ ] Model/table defined
- [ ] Has all expected fields
- [ ] Fields have appropriate types
- [ ] Relationships defined if needed
- [ ] Migrations exist and applied
- [ ] Client generated

### Hook/Utility Checklist
- [ ] File exists at expected path
- [ ] Exports function
- [ ] Has meaningful implementation (not empty returns)
- [ ] Used somewhere in the app
- [ ] Return values consumed

### Wiring Checklist
- [ ] Component → API: fetch/axios call exists and uses response
- [ ] API → Database: query exists and result returned
- [ ] Form → Handler: onSubmit calls API/mutation
- [ ] State → Render: state variables appear in JSX

</verification_checklist>

<automated_verification_script>

## Automated Verification Approach

For the verification subagent, use this pattern:

```bash
# 1. Check existence
check_exists() {
  [ -f "$1" ] && echo "EXISTS: $1" || echo "MISSING: $1"
}

# 2. Check for stub patterns
check_stubs() {
  local file="$1"
  local stubs=$(grep -c -E "TODO|FIXME|placeholder|not implemented" "$file" 2>/dev/null || echo 0)
  [ "$stubs" -gt 0 ] && echo "STUB_PATTERNS: $stubs in $file"
}

# 3. Check wiring (component calls API)
check_wiring() {
  local component="$1"
  local api_path="$2"
  grep -q "$api_path" "$component" && echo "WIRED: $component → $api_path" || echo "NOT_WIRED: $component → $api_path"
}

# 4. Check substantive (more than N lines, has expected patterns)
check_substantive() {
  local file="$1"
  local min_lines="$2"
  local pattern="$3"
  local lines=$(wc -l < "$file" 2>/dev/null || echo 0)
  local has_pattern=$(grep -c -E "$pattern" "$file" 2>/dev/null || echo 0)
  [ "$lines" -ge "$min_lines" ] && [ "$has_pattern" -gt 0 ] && echo "SUBSTANTIVE: $file" || echo "THIN: $file ($lines lines, $has_pattern matches)"
}
```

Run these checks against each must-have artifact. Aggregate results into VERIFICATION.md.

</automated_verification_script>

<human_verification_triggers>

## When to Require Human Verification

Some things can't be verified programmatically. Flag these for human testing:

**Always human:**
- Visual appearance (does it look right?)
- User flow completion (can you actually do the thing?)
- Real-time behavior (WebSocket, SSE)
- External service integration (Stripe, email sending)
- Error message clarity (is the message helpful?)
- Performance feel (does it feel fast?)

**Human if uncertain:**
- Complex wiring that grep can't trace
- Dynamic behavior depending on state
- Edge cases and error states
- Mobile responsiveness
- Accessibility

**Format for human verification request:**
```markdown
## Human Verification Required

### 1. Chat message sending
**Test:** Type a message and click Send
**Expected:** Message appears in list, input clears
**Check:** Does message persist after refresh?

### 2. Error handling
**Test:** Disconnect network, try to send
**Expected:** Error message appears, message not lost
**Check:** Can retry after reconnect?
```

</human_verification_triggers>

<test_execution>

## Level 4: Automated Test Execution

When must_haves includes a `tests` section, the verifier can run actual tests to verify functionality.

### Test Configuration Format

In PLAN.md frontmatter:

```yaml
must_haves:
  truths:
    - "User can log in with valid credentials"
  artifacts:
    - path: "src/auth/login.ts"
      provides: "Login handler"
  tests:
    - name: "Login flow"
      command: "npm test -- --grep 'login'"
      expect_exit: 0
      timeout: 30000
    - name: "API health"
      command: "curl -s localhost:3000/api/health"
      expect_contains: "ok"
    - name: "E2E login"
      command: "npx playwright test login.spec.ts"
      expect_exit: 0
      requires_server: true
```

### Test Types

**Unit/Integration tests (expect_exit):**
```yaml
- name: "Auth tests pass"
  command: "npm test -- auth"
  expect_exit: 0
  timeout: 60000  # ms, default 30000
```

**Output verification (expect_contains):**
```yaml
- name: "Server responds"
  command: "curl -s http://localhost:3000/health"
  expect_contains: "healthy"
```

**Output pattern (expect_pattern):**
```yaml
- name: "Version format"
  command: "node -e \"console.log(require('./package.json').version)\""
  expect_pattern: "^\\d+\\.\\d+\\.\\d+$"
```

**Multiple conditions:**
```yaml
- name: "Build succeeds with output"
  command: "npm run build"
  expect_exit: 0
  expect_contains: "Build complete"
  expect_not_contains: "warning"
```

### Server-Dependent Tests

For tests requiring a running server:

```yaml
- name: "E2E tests"
  command: "npx playwright test"
  expect_exit: 0
  requires_server: true
  server_command: "npm run dev"
  server_ready_pattern: "ready on"
  server_timeout: 10000
```

The verifier will:
1. Start server with `server_command`
2. Wait for `server_ready_pattern` in output
3. Run the test command
4. Kill the server after test completes

### Execution Flow

```bash
run_test() {
  local name="$1"
  local command="$2"
  local expect_exit="$3"
  local expect_contains="$4"
  local timeout="${5:-30000}"

  echo "Running: $name"

  # Execute with timeout
  OUTPUT=$(timeout $((timeout/1000)) bash -c "$command" 2>&1)
  EXIT_CODE=$?

  # Check exit code
  if [ -n "$expect_exit" ] && [ "$EXIT_CODE" -ne "$expect_exit" ]; then
    echo "FAIL: Expected exit $expect_exit, got $EXIT_CODE"
    return 1
  fi

  # Check output contains
  if [ -n "$expect_contains" ]; then
    if ! echo "$OUTPUT" | grep -q "$expect_contains"; then
      echo "FAIL: Output missing '$expect_contains'"
      return 1
    fi
  fi

  echo "PASS: $name"
  return 0
}
```

### Test Results in VERIFICATION.md

```markdown
## Test Execution Results

| Test | Command | Expected | Actual | Status |
|------|---------|----------|--------|--------|
| Login flow | npm test -- login | exit 0 | exit 0 | ✓ PASS |
| API health | curl /api/health | contains "ok" | "ok" | ✓ PASS |
| E2E login | playwright test | exit 0 | exit 1 | ✗ FAIL |

**Failed test output:**
```
Error: Login button not found
  at login.spec.ts:23
```
```

### When to Run Tests

Tests are optional. The verifier decides based on:

1. **tests section exists** in must_haves → Run tests
2. **No tests section** → Skip (Levels 1-3 only)
3. **Tests fail** → Mark as `gaps_found` with test failures in gaps

### Skipping Tests

To skip test execution (faster verification):

```bash
/spek:execute-phase 3 --skip-tests
```

Or in config.json:
```json
{
  "verification": {
    "run_tests": false
  }
}
```

### Auto-Detection

If no explicit tests configured, verifier can auto-detect:

```bash
# Check for test script in package.json
if [ -f package.json ] && grep -q '"test"' package.json; then
  echo "Found npm test script"
  # Offer to run: npm test
fi

# Check for test files
TEST_FILES=$(find . -name "*.test.*" -o -name "*.spec.*" | head -5)
if [ -n "$TEST_FILES" ]; then
  echo "Found test files: $TEST_FILES"
fi
```

When auto-detected, ask user:
```
Found test infrastructure. Run tests as part of verification?
- Yes, run all tests
- Yes, run relevant tests only (filter by phase files)
- No, skip tests
```

</test_execution>

<checkpoint_automation_reference>

## Pre-Checkpoint Automation

For automation-first checkpoint patterns, server lifecycle management, CLI installation handling, and error recovery protocols, see:

**@~/.claude/spek/references/checkpoints.md** → `<automation_reference>` section

Key principles:
- Claude sets up verification environment BEFORE presenting checkpoints
- Users never run CLI commands (visit URLs only)
- Server lifecycle: start before checkpoint, handle port conflicts, keep running for duration
- CLI installation: auto-install where safe, checkpoint for user choice otherwise
- Error handling: fix broken environment before checkpoint, never present checkpoint with failed setup

</checkpoint_automation_reference>
