---
title: "Best Practices"
description: "Recommendations for teams using AI agents to generate code."
order: 12
icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
---

Recommendations for teams using AI agents to generate code and wanting to maintain security standards.

## General rule

> **Never blindly trust the output of an AI agent.** Treat generated code with the same scrutiny you would apply to a pull request from a junior developer who does not know your stack.

---

## Dependencies

### Verify before installing

Before running `pip install` or `npm install` with dependencies suggested by an agent:

1. **Search for the package manually** on [pypi.org](https://pypi.org) or [npmjs.com](https://npmjs.com).
2. **Verify the exact name**: Agents frequently invent plausible names that do not exist.
3. **Check the age**: Be suspicious of packages created in the last 30 days.
4. **Check the downloads**: Packages with fewer than 100 weekly downloads deserve extra scrutiny.
5. **Look for the source repository**: Packages without a linked repository are suspicious.

### Run vigil deps before installing

```bash
# Verify dependencies BEFORE installing
vigil deps

# If there are critical findings, fix them first
vigil deps -f json | jq '.findings[] | select(.severity == "critical")'
```

### Maintain a lockfile

Lockfiles (`package-lock.json`, `poetry.lock`, `pip-tools` with generated `requirements.txt`) pin exact versions and hashes. This prevents a package from being modified between runs.

### Do not accept invented versions

Agents sometimes suggest versions that do not exist:

```
# This may be invented by the agent
flask==99.0.0
```

vigil detects this with rule DEP-007, but it is good practice to manually verify versions.

---

## Authentication and authorization

### Always add auth middleware

When an agent generates endpoints, **always** add authentication explicitly. Agents tend to generate functional endpoints but without protection.

**Bad (agent-generated):**
```python
@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    db.delete_user(user_id)
    return {"deleted": user_id}
```

**Good (corrected):**
```python
@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(403)
    db.delete_user(user_id)
    return {"deleted": user_id}
```

### CORS: restrict origins

**Never** accept CORS with `*` in production:

```python
# BAD
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# GOOD
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com", "https://admin.myapp.com"],
)
```

### JWT: generate real secrets

```python
# BAD
SECRET_KEY = "supersecret123"

# GOOD
import secrets
# Generate once and store in environment variable
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
# To generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Cookies: enable all flags

```python
response.set_cookie(
    "session",
    value=token,
    httponly=True,     # Not accessible from JavaScript
    secure=True,       # Only send via HTTPS
    samesite="lax",    # CSRF protection
    max_age=3600,      # Expiration
)
```

---

## Secrets and credentials

### Never hardcode secrets

Even if the agent suggests "temporary" default values:

```python
# BAD — the agent generates it this way
DATABASE_URL = "postgresql://admin:password123@localhost:5432/mydb"
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-not-for-production")

# GOOD — no insecure defaults
DATABASE_URL = os.environ["DATABASE_URL"]  # Fails if not defined
SECRET_KEY = os.environ["SECRET_KEY"]
```

### Use .env with .gitignore

1. Create `.env.example` with **placeholders** (not real values):
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   SECRET_KEY=generate-with-secrets-module
   ```

2. Create `.env` with real values (never commit).

3. Add to `.gitignore`:
   ```
   .env
   .env.local
   .env.production
   *.pem
   *.key
   credentials.json
   ```

### Verify with vigil

```bash
# Detects placeholder secrets, low entropy, and values copied from .env.example
vigil scan src/ -C secrets
```

---

## Tests

### Require real assertions

A test without assertions is not a test:

```python
# BAD — only verifies it does not crash
def test_login():
    response = client.post("/login", json={"user": "admin", "pass": "123"})

# GOOD — verifies behavior
def test_login():
    response = client.post("/login", json={"user": "admin", "pass": "123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
```

### Verify status codes in API tests

```python
# BAD — does not verify if the request failed
def test_get_users():
    response = client.get("/users")
    users = response.json()
    assert len(users) > 0

# GOOD
def test_get_users():
    response = client.get("/users")
    assert response.status_code == 200
    users = response.json()
    assert len(users) > 0
```

### Do not catch generic exceptions in tests

```python
# BAD — hides real errors
def test_complex_operation():
    try:
        result = complex_operation()
    except Exception:
        pass  # The test never fails

# GOOD — let the exception propagate
def test_complex_operation():
    result = complex_operation()
    assert result.status == "success"
```

### Avoid circular mocks

```python
# BAD — the mock returns exactly what the test expects
def test_calculate():
    with patch("app.calculate") as mock:
        mock.return_value = 42
        result = app.calculate(6, 7)
        assert result == 42  # Nothing real was tested

# GOOD — mock the dependency, not the function under test
def test_calculate():
    with patch("app.database.get_multiplier") as mock:
        mock.return_value = 2
        result = app.calculate(6, 7)
        assert result == 26  # 6 * 7 / 2 — real logic tested
```

### Run vigil tests regularly

```bash
# Detect tests without assertions, trivial ones, and circular mocks
vigil tests

# Require at least 2 assertions per test
vigil tests --min-assertions 2
```

---

## Recommended workflow

### For individual developers

1. **Pre-commit hook**: `vigil scan --changed-only --fail-on critical --quiet`
2. **Before PR**: `vigil scan src/ --fail-on high`
3. **Manual review**: Read each finding and fix.

### For teams

1. **Shared config**: Commit `.vigil.yaml` with the team's configuration.
2. **Mandatory CI**: vigil in the PR pipeline with `--fail-on high`.
3. **Strict production**: `strict` config for releases.
4. **Document exceptions**: If a rule is disabled, document why in the config.

```yaml
# .vigil.yaml
rules:
  # Disabled because we use long-lived tokens for webhooks
  # Approved by: @security-team in PR #123
  AUTH-003:
    enabled: false
```

### Progressive escalation

| Week | fail-on | Active rules | Objective |
|------|---------|--------------|-----------|
| 1 | critical | DEP-001, DEP-007, SEC-001-003 | Most severe issues only |
| 2 | high | + AUTH-001, AUTH-002, AUTH-005 | Add auth |
| 3 | high | + TEST-001, SEC-004-006 | Add tests and secrets |
| 4 | medium | All | Full coverage |

---

## Improved prompts for agents

When using an AI agent, include security instructions in the prompt:

### For dependencies

> "Generate the code using only packages that exist on PyPI. Verify that the names are correct. Do not invent packages."

### For authentication

> "All endpoints must have authentication. Use Depends(get_current_user) in FastAPI. DELETE and PUT endpoints require explicit authorization."

### For secrets

> "Do not hardcode secrets or default values. All sensitive configurations must be read from environment variables without a default value."

### For tests

> "Each test must have at least 2 meaningful assertions. Do not use assert is not None as the sole assertion. Always verify the status code in API tests."

---

## AI-generated code review checklist

Before approving a PR with AI-generated code:

- [ ] Run `vigil scan` and fix all findings.
- [ ] Verify that all dependencies exist in the registry.
- [ ] Confirm that there are no hardcoded secrets.
- [ ] Verify that endpoints have auth middleware.
- [ ] Confirm that CORS is restricted to specific origins.
- [ ] Verify that tests have meaningful assertions.
- [ ] Check that `.env` is in `.gitignore`.
- [ ] Confirm that no values are copied from `.env.example`.
