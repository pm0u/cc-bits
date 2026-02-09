# Flow Spec Format

SPEC.md is the single source of truth for a feature. It combines SENDIT's clarity with FUCKIT's decision capture.

## Hierarchical Structure

### Parent Spec
Located at `specs/{feature}/SPEC.md` - defines architecture and shared context for children.

### Child Specs
Located at `specs/{feature}/{child}/SPEC.md` - inherits parent context, adds specific requirements.

## SPEC.md Format

### Frontmatter

```yaml
---
name: Feature Name
status: DRAFT | ACTIVE | IMPLEMENTED | DEPRECATED
type: parent | child
parent: path/to/parent  # Only for child specs
depends_on:             # Only for child specs
  - path/to/dependency
  - another/dependency
phase: foundation       # Optional - for grouping in status display
---
```

**Status values:**
- `DRAFT` - Under discussion, not ready for implementation
- `ACTIVE` - Ready for implementation, currently being worked on
- `IMPLEMENTED` - Complete, in production
- `DEPRECATED` - No longer maintained

**Type values:**
- `parent` - Has children, defines shared architecture
- `child` - Standalone or child of parent

**Dependencies:**
- Path to other specs this depends on
- System uses for execution ordering
- Can be empty if no dependencies

**Phase:**
- Optional label for grouping related children
- Defined in parent spec's `phases` section
- Only for visual organization, not execution control

### Parent Spec Sections

```markdown
# Feature: User Authentication

## Overview
High-level description of the feature and its purpose.

## Architecture Decisions (Applies to All Children)
Core decisions that all child specs must honor:
- Technology choices (JWT, not sessions)
- Shared patterns (error handling, logging)
- Integration points (how children interact)

## Sub-Specs
List of child specs with brief descriptions:
- `session/` - Session management and token lifecycle
- `api/` - Authentication endpoints
- `ui/` - Login and signup interface

## Phases (Optional)
Visual grouping of children for status display:

```yaml
phases:
  foundation:
    - session
    - database
  backend:
    - api
    - middleware
  frontend:
    - ui
    - components
```

## Requirements
High-level requirements that apply across children.

## Integration Points
How children connect and depend on each other.

## Deferred Ideas
Future work captured but not in current scope:
- OAuth providers
- 2FA
- Passwordless login
```

### Child Spec Sections

```markdown
# Feature: Session Management

## Context

### Implementation Decisions (Locked)
User's explicit choices - planner MUST honor these:
- Token storage: httpOnly cookies
- Token expiry: 1 hour
- Refresh token rotation enabled

### Claude's Discretion
Areas where Claude has implementation freedom:
- Token format (JWT structure)
- Refresh token storage mechanism
- Cleanup job schedule

### Deferred Ideas
Scope creep captured for future:
- Token revocation list
- Device fingerprinting

## Requirements
What this spec must deliver:
- Generate JWT tokens on login
- Validate tokens on each request
- Refresh expired tokens
- Clean up old sessions

## Acceptance Criteria
Testable success criteria:
- [ ] User can log in and receive valid token
- [ ] Token is validated on protected routes
- [ ] Expired token triggers refresh flow
- [ ] Invalid token returns 401

## Technical Details (Optional)
Implementation notes:
- Use `jsonwebtoken` library
- Store refresh tokens in Redis
- Cleanup job runs daily at 2am

## Files
Source files created/modified by this spec:
- `src/auth/session.ts`
- `src/auth/tokens.ts`
- `src/auth/middleware.ts`

## Tests
Test files for this spec:
- `tests/auth/session.test.ts`
- `tests/auth/tokens.test.ts`

## OPEN (Optional)
Unresolved questions - must be resolved before status: ACTIVE:
- Where to store refresh tokens? (Redis vs DB)
- Token payload structure?
```

## Context Section (Key Innovation)

The Context section separates:

### 1. Implementation Decisions (Locked)
- User's explicit choices from discussion phase
- Planner and executor MUST honor these
- Changing these requires re-discussion

**Example:**
```markdown
### Implementation Decisions (Locked)
- Use JWT tokens (not sessions)
- 24-hour expiry
- Store in httpOnly cookies
- No third-party auth in v1
```

### 2. Claude's Discretion
- Areas where Claude has freedom to choose
- User trusts implementation details
- Can change without re-discussion

**Example:**
```markdown
### Claude's Discretion
- JWT signing algorithm
- Token refresh mechanism
- Error message wording
- Logging verbosity
```

### 3. Deferred Ideas
- Scope creep captured during discussion
- Not lost, but explicitly out of scope
- Can become future specs

**Example:**
```markdown
### Deferred Ideas
- OAuth integration (v2)
- Biometric auth (future)
- Remember me checkbox (future)
```

## Inheritance (Parent → Child)

Child specs inherit from parent:

### Automatic Inheritance
- Architecture Decisions from parent apply to all children
- Children don't repeat parent decisions

### Context Merge
- Child Context merges with parent Architecture Decisions
- Child Decisions add to (don't replace) parent Decisions
- Conflicts should be flagged during cascade updates

## Cascade Updates

When parent SPEC.md changes:
1. System detects affected children
2. Offers to update each child
3. For each child:
   - Shows what changed in parent
   - Updates child Context if needed
   - Flags manual review if conflict
   - Offers to re-plan if already planned

## Dependency Resolution

Dependencies create a directed acyclic graph (DAG):

```
session (no deps)
    ↓
   api (depends on session)
    ↓
   ui (depends on api)
```

System uses topological sort to compute execution order.

### Parallel Execution

Independent specs execute in parallel:

```
session (no deps)    database (no deps)
    ↓                     ↓
    +---------+-----------+
              ↓
         api (depends on both)
              ↓
         ui (depends on api)
```

`session` and `database` can run simultaneously.

### Circular Dependency Detection

System detects and rejects circular dependencies:

```
A → B → C → A  ❌ Invalid
```

Error: "Circular dependency detected: A → B → C → A"

## Status Transitions

```
DRAFT → ACTIVE → IMPLEMENTED

         ↓
    DEPRECATED
```

- **DRAFT** - Created during discussion, has OPEN items
- **ACTIVE** - Ready gate passed, in implementation
- **IMPLEMENTED** - Code complete, tests pass, verified
- **DEPRECATED** - No longer maintained

## File Locations

### Simple Feature (No Children)
```
specs/
  logout-button/
    SPEC.md
    PLAN.md
```

### Hierarchical Feature
```
specs/
  auth/
    SPEC.md              # Parent
    session/
      SPEC.md            # Child
      PLAN.md
    api/
      SPEC.md            # Child
      PLAN.md
    ui/
      SPEC.md            # Child
      PLAN.md
```

### Deep Hierarchy
```
specs/
  app/
    SPEC.md                    # Top parent
    auth/
      SPEC.md                  # Parent within parent
      session/SPEC.md          # Leaf child
      api/SPEC.md              # Leaf child
    content/
      SPEC.md
      posts/SPEC.md
      comments/SPEC.md
```

## Validation Rules

### Ready Gate (Before Implementation)
- [ ] No OPEN section (or empty)
- [ ] At least one Acceptance Criterion
- [ ] Status is ACTIVE
- [ ] At least one Requirement
- [ ] All dependencies exist
- [ ] No circular dependencies

### Completion Gate (After Implementation)
- [ ] All Acceptance Criteria marked done
- [ ] Files section lists actual files
- [ ] Tests section lists actual tests
- [ ] Tests pass
- [ ] Status updated to IMPLEMENTED

## Example: Full Child Spec

```markdown
---
name: Session Management
status: ACTIVE
type: child
parent: auth
depends_on: []
phase: foundation
---

# Feature: Session Management

## Context

### Implementation Decisions (Locked)
- JWT tokens stored in httpOnly cookies
- 1-hour access token expiry
- 7-day refresh token expiry
- Refresh token rotation on each refresh

### Claude's Discretion
- JWT signing algorithm choice
- Token payload structure
- Cleanup job schedule
- Error codes and messages

### Deferred Ideas
- Token revocation list (future)
- Device fingerprinting (future)
- Session history (future)

## Requirements
- Generate JWT access and refresh tokens on login
- Validate access tokens on protected routes
- Refresh expired access tokens using refresh token
- Rotate refresh tokens on each use
- Clean up expired sessions automatically

## Acceptance Criteria
- [ ] User logs in and receives both tokens in httpOnly cookies
- [ ] Access token is validated on protected routes
- [ ] Expired access token with valid refresh triggers token refresh
- [ ] Refresh token is rotated after each refresh
- [ ] Invalid tokens return 401 with clear error message
- [ ] Cleanup job removes sessions older than 7 days

## Technical Details
- Use `jsonwebtoken` library for JWT operations
- Store refresh tokens in Redis with 7-day TTL
- Access tokens: 1 hour expiry, no storage needed
- Cleanup job: daily at 2am UTC

## Files
- `src/auth/session.ts` - Session management logic
- `src/auth/tokens.ts` - Token generation and validation
- `src/auth/middleware.ts` - Auth middleware for routes
- `src/jobs/session-cleanup.ts` - Cleanup job

## Tests
- `tests/auth/session.test.ts` - Session management tests
- `tests/auth/tokens.test.ts` - Token operations tests
- `tests/auth/middleware.test.ts` - Middleware tests
```
