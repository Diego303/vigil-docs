---
title: "Best Practices"
description: "Recommendations for teams using AI agents to generate code."
order: 12
icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
---

# Best practices

Recommendations for teams using AI agents to generate code and wanting to maintain security standards.

## General rule

> **Never blindly trust the output of an AI agent.** Treat generated code with the same scrutiny you would apply to a pull request from a junior developer who is unfamiliar with your stack.

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

---

## Authentication and authorization

### Always add auth middleware

When an agent generates endpoints, **always** add authentication explicitly.

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
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
# To generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Cookies: enable all flags

```python
response.set_cookie(
    "session",
    value=token,
    httponly=True,
    secure=True,
    samesite="lax",
    max_age=3600,
)
```

---

## Secrets and credentials

### Never hardcode secrets

```python
# BAD
DATABASE_URL = "postgresql://admin:password123@localhost:5432/mydb"
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-not-for-production")

# GOOD
DATABASE_URL = os.environ["DATABASE_URL"]
SECRET_KEY = os.environ["SECRET_KEY"]
```

### Use .env with .gitignore

1. Create `.env.example` with **placeholders** (not real values).
2. Create `.env` with real values (never commit).
3. Add to `.gitignore`: `.env`, `.env.local`, `.env.production`, `*.pem`, `*.key`, `credentials.json`

---

## Tests

### Require real assertions

```python
# BAD
def test_login():
    response = client.post("/login", json={"user": "admin", "pass": "123"})

# GOOD
def test_login():
    response = client.post("/login", json={"user": "admin", "pass": "123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
```

### Avoid circular mocks

```python
# BAD
def test_calculate():
    with patch("app.calculate") as mock:
        mock.return_value = 42
        result = app.calculate(6, 7)
        assert result == 42  # Nothing real was tested

# GOOD
def test_calculate():
    with patch("app.database.get_multiplier") as mock:
        mock.return_value = 2
        result = app.calculate(6, 7)
        assert result == 26
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

### Progressive scaling

| Week | fail-on | Active rules | Goal |
|------|---------|--------------|------|
| 1 | critical | DEP-001, DEP-007, SEC-001-003 | Only the most severe |
| 2 | high | + AUTH-001, AUTH-002, AUTH-005 | Add auth |
| 3 | high | + TEST-001, SEC-004-006 | Add tests and secrets |
| 4 | medium | All | Full coverage |

---

## Improved prompts for AI agents

When using an AI agent, include security instructions in the prompt:

- **Dependencies**: "Generate the code using only packages that exist on PyPI. Verify that the names are correct."
- **Authentication**: "All endpoints must have authentication. Use Depends(get_current_user) in FastAPI."
- **Secrets**: "Do not hardcode secrets or default values. All sensitive configurations must be read from environment variables without default values."
- **Tests**: "Each test must have at least 2 meaningful assertions. Always verify the status code in API tests."

---

## AI-generated code review checklist

- [ ] Run `vigil scan` and fix all findings.
- [ ] Verify that all dependencies exist in the registry.
- [ ] Confirm that there are no hardcoded secrets.
- [ ] Verify that endpoints have auth middleware.
- [ ] Confirm that CORS is restricted to specific origins.
- [ ] Verify that tests have meaningful assertions.
- [ ] Check that `.env` is in `.gitignore`.
- [ ] Confirm that no values are copied from `.env.example`.
