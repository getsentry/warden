# access-control-vulnerabilities Specification

## Intent

This is a Superwarden child skill synthesized from the parent **security** skill for focused detection of access control vulnerabilities.

The parent task prompt defines the high-level goal: detect broken authentication, authorization bypass, privilege escalation, and insecure direct object references. This specification expands that intent into a complete security-review quality detection system with vulnerability prerequisites, exploitable dataflow examples, false-positive controls, severity/confidence calibration, remediation patterns, and framework/runtime caveats.

## Scope

### In Scope

- **Missing Authentication:** Protected resources accessed without verifying authenticated state
- **Authorization Bypass:** Resource access without ownership, role, or permission validation
- **Horizontal Privilege Escalation:** Accessing resources belonging to other users at the same privilege level
- **Vertical Privilege Escalation:** Accessing resources or operations requiring higher privileges
- **Insecure Direct Object Reference (IDOR):** User-controlled identifiers used without access validation
- **Bypassed Protection Mechanisms:** Middleware, guards, or decorators incorrectly applied or missing
- **Client-Side Only Enforcement:** Authorization decisions made in UI without server validation

### Out of Scope (Hard Boundaries from Sibling Tasks)

- **Injection vulnerabilities:** SQL injection, command injection, code injection, template injection → owned by `injection-vulnerabilities`
- **Cryptographic flaws:** Weak algorithms, insecure random, hardcoded keys, improper certificate validation → owned by `cryptographic-vulnerabilities`
- **Dependency vulnerabilities:** Known CVEs in third-party packages → owned by `dependency-vulnerabilities`
- **Secrets exposure:** Hardcoded credentials, API keys, tokens in source → owned by `secrets-exposure`
- **Resource handling:** Unbounded loops, memory leaks, missing size limits → owned by `resource-handling-vulnerabilities`
- **Logging/monitoring gaps:** Unless directly related to access control enforcement failure detection

### Boundary Cases

These edge cases clarify scope boundaries:

1. **Session management flaws:** In scope when they bypass authentication (e.g., session fixation leading to account takeover). Out of scope when they involve cryptographic session token generation (→ cryptographic-vulnerabilities).
2. **SQL injection in authorization queries:** Report as authorization bypass if the injection allows bypassing access checks. Do not duplicate detailed injection analysis (→ injection-vulnerabilities).
3. **Hardcoded admin credentials:** Out of scope (→ secrets-exposure). Focus on missing checks, not credential storage.
4. **Rate limiting on login endpoints:** Out of scope (→ resource-handling-vulnerabilities) unless the absence enables brute-force that bypasses authentication.

## Users And Trigger Context

### Primary Users
- Security reviewers analyzing pull requests for access control flaws
- Developers running pre-commit security checks
- Automated CI/CD pipelines enforcing security gates

### Trigger Context
- Invoked by Warden when analyzing changed files in a diff
- Receives scoped hunks (changed line ranges) for analysis
- Expected to return findings anchored to changed lines or empty array when no issues found

## Runtime Contract

### Execution Flow

1. **Receive scoped hunks:** Changed code chunks with line ranges from Warden's diff pipeline
2. **Repository-local investigation:** Use Read, Grep, Glob to map access control model and protection mechanisms
3. **External research (when needed):** Use WebSearch/WebFetch for public framework/library documentation when framework-specific patterns affect correctness
4. **Vulnerability analysis:** Trace request flows, identify missing checks, validate prerequisites
5. **Return findings:** Report only concrete findings with changed-line anchoring and exploitable paths

### Investigation Tools

- **Read:** Inspect middleware, guards, route configurations, authentication modules
- **Grep:** Search for authentication/authorization patterns across the codebase
- **Glob:** Find framework-specific files (route definitions, middleware, decorators)
- **WebSearch/WebFetch:** Research public framework documentation and OWASP guidance

### Privacy and Security Constraints

**CRITICAL:** You MUST NOT send repository code, secrets, private file paths, or proprietary details to web tools.

Allowed in web tool queries:
- Public framework names (Express, Next.js, Django, FastAPI, Rails)
- Public package names (Passport.js, NextAuth, Auth0)
- Generic vulnerability terms (IDOR, privilege escalation, authorization bypass)
- OWASP/CWE classification terms

Forbidden in web tool queries:
- Repository source code snippets
- Private file paths or internal module names
- Secrets, API keys, or credentials
- Proprietary business logic or internal API structures

### Output Requirements

- Use Warden's normal Finding schema (id, severity, confidence, title, description, location, suggestedFix)
- Anchor findings to changed lines within analyzed hunks
- Return empty array when no concrete vulnerabilities are found
- Do not invent custom output schemas

## Source And Evidence Model

### Authoritative Sources

1. **Repository Source Code (Local):**
   - Middleware, decorators, route guards, authentication modules
   - Framework-specific configuration (routes, policies, permissions)
   - Request handlers, controllers, endpoints
   - Trust tier: Canonical for understanding the application's access control model

2. **Public Framework Documentation (External):**
   - Express.js, Next.js, FastAPI, Django, Rails, etc.
   - Authentication libraries (Passport.js, NextAuth, etc.)
   - Authorization libraries and patterns
   - Trust tier: Authoritative for framework-expected patterns
   - Usage constraints: Use only public documentation; do not send proprietary code

3. **OWASP and CWE (External):**
   - OWASP Top 10 (A01: Broken Access Control)
   - CWE-639 (IDOR), CWE-862 (Missing Authorization), CWE-284 (Improper Access Control), CWE-269 (Improper Privilege Management)
   - Trust tier: Authoritative for vulnerability classification and severity guidance
   - Usage constraints: Public security guidance only

### Evidence Requirements (from Parent Task)

Every finding MUST include:

1. **Changed line range:** Specific lines in the diff showing protected resource access without authentication or authorization check
2. **Control flow path:** Traced path demonstrating bypass or missing validation from entry point to resource access
3. **Framework documentation (if applicable):** Public documentation showing expected access control pattern when framework-specific
4. **Absence of protection:** Confirmed lack of role validation, ownership check, or permission enforcement at the access point

## Reference Architecture

### Common Access Control Patterns by Framework

#### Express.js (Node.js)
```javascript
// Middleware-based authentication
app.use('/api/protected', authenticate);

// Route-specific middleware
app.get('/admin/users', authenticate, requireAdmin, handler);

// Manual checks in handler
app.get('/users/:id', authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).send('Forbidden');
  }
  // ... access resource
});
```

#### Next.js (App Router)
```typescript
// Data Access Layer (DAL) pattern
export async function getUser(id: string) {
  const session = await verifySession(); // Must be in DAL
  if (session.userId !== id && !session.isAdmin) {
    throw new Error('Unauthorized');
  }
  return db.user.findUnique({ where: { id } });
}

// Server Action with auth check
export async function updateProfile(data: ProfileData) {
  const session = await auth();
  if (!session) redirect('/login');
  // ... perform update
}
```

#### FastAPI (Python)
```python
# Dependency injection for authentication
from fastapi import Depends

@app.get("/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user)  # Auth check
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(403)
    return await db.get_user(user_id)
```

#### Django REST Framework (Python)
```python
# Class-based view with permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes

@permission_classes([IsAuthenticated])
class UserViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Automatic filtering by current user
        return User.objects.filter(id=self.request.user.id)
```

### Vulnerability Pattern Taxonomy

1. **Missing Authentication (CWE-306):**
   - No check that a user is logged in before accessing protected resources
   - Example: Admin panel accessible without login

2. **Missing Authorization (CWE-862):**
   - Authentication present, but no check of user's rights to the specific resource
   - Example: Any authenticated user can access any user's profile

3. **IDOR (CWE-639):**
   - User-controlled parameter references objects without ownership validation
   - Example: `/api/documents/123` where `123` is user-provided and not validated

4. **Horizontal Privilege Escalation:**
   - Accessing resources belonging to users at the same privilege level
   - Example: User A accessing User B's shopping cart

5. **Vertical Privilege Escalation (CWE-269):**
   - Accessing resources or operations requiring higher privileges
   - Example: Regular user accessing admin-only functions

6. **Client-Side Only Enforcement:**
   - Authorization decisions made in UI/frontend without server-side validation
   - Example: Admin button hidden in UI but API endpoint unprotected

## Evaluation

### Detection Quality Metrics

1. **Precision:** Percentage of reported findings that are true vulnerabilities
   - Target: >90% (minimize false positives)
   - Achieved through prerequisite validation and false-positive controls

2. **Recall:** Percentage of actual vulnerabilities detected
   - Target: >80% for high-severity access control issues
   - Achieved through comprehensive pattern coverage and dataflow tracing

3. **Severity Accuracy:** Findings classified at appropriate severity levels
   - Validated against OWASP/CWE severity guidance
   - Calibrated by impact (data exposure, privilege escalation scope)

### Validation Approach

1. **Positive Test Cases:** Known vulnerable code patterns should trigger findings
   - IDOR without ownership check
   - Missing authentication on protected endpoints
   - Role escalation without admin check

2. **Negative Test Cases:** Secure patterns should NOT trigger findings
   - Properly protected routes with middleware
   - Ownership validation present
   - Intentionally public endpoints

3. **Framework Coverage:** Verify correct pattern detection across frameworks
   - Express.js middleware patterns
   - Next.js Data Access Layer patterns
   - FastAPI dependency injection
   - Django permission classes

## Known Limitations

### Technical Limitations

1. **Dynamic authorization logic:** Cannot fully analyze runtime permission checks from external services or databases
2. **Implicit framework protections:** May not recognize all framework-specific auto-applied protections without consulting documentation
3. **Interprocedural analysis depth:** Limited by hunk boundaries; may miss protection in calling functions outside the diff
4. **Framework version variance:** Patterns may differ across major framework versions

### Scope Limitations

1. **Business logic authorization:** Cannot validate domain-specific business rules (e.g., "users can only edit posts they created within 24 hours")
2. **Multi-factor authentication:** Detects missing authentication but not missing second-factor requirements
3. **Time-based access control:** Cannot detect missing time windows or expiration checks
4. **Complex RBAC:** May not fully analyze hierarchical role structures or permission inheritance

### Mitigation Strategies

1. Use `confidence: medium` when protection may exist outside visible context
2. Reference public framework documentation in findings for validation
3. Recommend security testing for complex authorization logic
4. Flag patterns that require manual review when automated detection is insufficient

## Maintenance Notes

### When to Update This Child Skill

1. **New framework patterns emerge:** New popular frameworks or authentication libraries
2. **OWASP guidance changes:** Updates to OWASP Top 10 or CWE classifications
3. **False positive patterns identified:** Add to false-positive controls section
4. **New vulnerability patterns:** Emerging access control bypass techniques
5. **Parent task scope changes:** Updates to sibling task boundaries or parent outOfScope

### External Source Refresh Triggers

- OWASP Top 10 updates (typically every 3-4 years)
- Major framework version releases with authentication changes
- New CWE classifications related to access control
- Security advisories for popular authentication libraries

### Skill Quality Checklist

- [ ] Vulnerability prerequisites are explicit and testable
- [ ] Exploitable dataflow examples provided for each vulnerability class
- [ ] False-positive controls documented with clear exclusion criteria
- [ ] Severity and confidence calibration aligned with OWASP/CWE guidance
- [ ] Remediation patterns reference public framework documentation
- [ ] Framework/runtime caveats cover major web frameworks
- [ ] Changed-line anchoring enforced in output requirements
- [ ] Privacy constraints prohibit sending proprietary code to web tools
- [ ] Sibling task boundaries explicitly stated and enforced
