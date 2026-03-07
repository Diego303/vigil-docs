---
title: "Rules Catalog"
description: "All 26 vigil rules across 4 categories with vulnerable code examples."
order: 5
icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"
---

# Rules Catalog

vigil V0 includes 26 rules across 4 categories. Each rule has a unique ID, default severity, and references to security standards where applicable.

To list all rules from the terminal:

```bash
vigil rules
```

---

## CAT-01: Dependency Hallucination

> **Status: IMPLEMENTED** — The `DependencyAnalyzer` is active. Rules DEP-001, DEP-002, DEP-003, DEP-005, and DEP-007 are implemented. DEP-004 and DEP-006 are deferred to a future version.

Detects hallucinated dependencies (slopsquatting), typosquatting, and suspicious packages. This is vigil's main differentiator — no other scanner verifies that dependencies actually exist.

### DEP-001 — Hallucinated dependency

| Field | Value |
|-------|-------|
| Severity | CRITICAL |
| OWASP | LLM03 — Supply Chain Vulnerabilities |
| CWE | CWE-829 — Inclusion of Functionality from Untrusted Control Sphere |

**What it detects:** A package declared as a dependency does not exist in the public registry (PyPI or npm).

**Why it is critical:** LLMs frequently generate package names that sound plausible but do not exist. An attacker can register that name with malicious code (slopsquatting). When someone runs `pip install` or `npm install`, they install the malicious package.

**Vulnerable code example:**

```
# requirements.txt
flask==3.0.0
python-jwt-utils==1.0.0    # This package does NOT exist in PyPI
requests==2.31.0
```

**How to fix it:** Search PyPI/npm for the correct package. In this case, the agent probably meant `PyJWT` or `python-jose`.

---

### DEP-002 — Suspiciously new dependency

| Field | Value |
|-------|-------|
| Severity | HIGH |
| OWASP | LLM03 |

**What it detects:** The package exists but was published less than 30 days ago (configurable with `deps.min_age_days`).

**Why it matters:** New packages have not had time to be audited by the community. They could be malicious packages registered as part of a slopsquatting attack.

**Example:** A package created 3 days ago with a useful-sounding name (`fast-json-parser`) that no one has reviewed.

**How to fix it:** Manually verify the package: review the source code, the maintainer, the purpose. If it is legitimate, add an exception in the config.

---

### DEP-003 — Typosquatting candidate

| Field | Value |
|-------|-------|
| Severity | HIGH |
| OWASP | LLM03 |
| CWE | CWE-829 |

**What it detects:** The package name is very similar to a popular package (normalized Levenshtein distance >= 0.85).

**Vulnerable code example:**

```
# requirements.txt
reqeusts==2.31.0     # Typo of "requests"
```

**How to fix it:** Verify the correct package name. In the suggestion, vigil indicates the popular package it resembles.

---

### DEP-004 — Unpopular dependency (pending)

| Field | Value |
|-------|-------|
| Severity | MEDIUM |
| Status | **Deferred** — requires download statistics API |

**What it detects:** The package has fewer than 100 weekly downloads (configurable with `deps.min_weekly_downloads`).

**Why it matters:** Packages with very few downloads may be abandoned, have unpatched vulnerabilities, or be an indicator of a fake package.

---

### DEP-005 — No source repository

| Field | Value |
|-------|-------|
| Severity | MEDIUM |

**What it detects:** The package does not have a source code repository linked in its metadata.

**Why it matters:** Without access to the source code, it is impossible to audit what the package does. Legitimate packages almost always have a linked repository.

---

### DEP-006 — Missing dependency (pending)

| Field | Value |
|-------|-------|
| Severity | HIGH |
| Status | **Deferred** — requires AST import parser |

**What it detects:** An `import` in the code references a module that is not declared in the project's dependencies.

**Vulnerable code example:**

```python
# src/app.py
import magical_orm    # Not in requirements.txt or pyproject.toml

def get_users():
    return magical_orm.query("SELECT * FROM users")
```

---

### DEP-007 — Nonexistent version

| Field | Value |
|-------|-------|
| Severity | CRITICAL |

**What it detects:** The specified version of the package does not exist in the registry.

**Vulnerable code example:**

```
# requirements.txt
flask==99.0.0        # This version does not exist
```

---

## CAT-02: Auth & Permission Patterns

> **Status: IMPLEMENTED** — The `AuthAnalyzer` has been active since v0.3.0. All rules AUTH-001 through AUTH-007 are implemented. Supports Python (FastAPI/Flask) and JavaScript (Express).

Detects insecure authentication and authorization patterns that AI agents frequently generate.

### AUTH-001 — Unprotected sensitive endpoint

| Field | Value |
|-------|-------|
| Severity | HIGH |
| OWASP | LLM06 — Excessive Agency |
| CWE | CWE-306 — Missing Authentication for Critical Function |

**What it detects:** An endpoint that handles sensitive data (users, payments, admin) without authentication middleware.

**Vulnerable code example (FastAPI):**

```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):    # No Depends(get_current_user)
    return db.get_user(user_id)
```

---

### AUTH-002 — Destructive endpoint without authorization

| Field | Value |
|-------|-------|
| Severity | HIGH |
| CWE | CWE-862 — Missing Authorization |

**What it detects:** A DELETE or PUT endpoint without authorization verification.

**Vulnerable code example:**

```python
@app.delete("/users/{user_id}")
async def delete_user(user_id: int):    # Anyone can delete users
    db.delete_user(user_id)
    return {"deleted": user_id}
```

---

### AUTH-003 — Excessive token lifetime

| Field | Value |
|-------|-------|
| Severity | MEDIUM |

**What it detects:** JWT with a lifetime exceeding 24 hours (configurable with `auth.max_token_lifetime_hours`).

**Vulnerable code example:**

```python
token = jwt.encode(
    {"exp": datetime.utcnow() + timedelta(hours=72)},  # 72 hours
    SECRET_KEY
)
```

---

### AUTH-004 — Hardcoded JWT secret

| Field | Value |
|-------|-------|
| Severity | CRITICAL |
| CWE | CWE-798 — Use of Hard-coded Credentials |

**What it detects:** A hardcoded JWT secret with a placeholder value or low entropy.

**Vulnerable code example:**

```python
SECRET_KEY = "supersecret123"    # Hardcoded and predictable
token = jwt.encode(payload, SECRET_KEY)
```

---

### AUTH-005 — CORS allow all origins

| Field | Value |
|-------|-------|
| Severity | HIGH |
| CWE | CWE-942 — Permissive Cross-domain Policy |

**What it detects:** CORS configured with `*` allowing requests from any origin.

**Vulnerable code example:**

```python
# FastAPI
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# Express
app.use(cors())    # No options = allow all
```

---

### AUTH-006 — Insecure cookie configuration

| Field | Value |
|-------|-------|
| Severity | MEDIUM |
| CWE | CWE-614 — Sensitive Cookie in HTTPS Session Without 'Secure' Attribute |

**What it detects:** Cookies without the security flags `httpOnly`, `secure`, or `sameSite`.

---

### AUTH-007 — Password comparison not timing-safe

| Field | Value |
|-------|-------|
| Severity | MEDIUM |
| CWE | CWE-208 — Observable Timing Discrepancy |

**What it detects:** Password comparison using `==` instead of a constant-time comparison function.

**Vulnerable code example:**

```python
if user.password == provided_password:    # Vulnerable to timing attacks
    return True
```

**Fix:**

```python
import hmac
if hmac.compare_digest(user.password_hash, computed_hash):
    return True
```

---

## CAT-03: Secrets & Credentials

> **Status: IMPLEMENTED** — The `SecretsAnalyzer` has been active since v0.3.0. Rules SEC-001 through SEC-004 and SEC-006 are implemented. SEC-005 is deferred (requires .gitignore analysis). Supports Python and JavaScript/TypeScript.

Detects secrets and credentials that AI agents copy from examples or generate insecurely.

### SEC-001 — Placeholder secret in code

| Field | Value |
|-------|-------|
| Severity | CRITICAL |
| CWE | CWE-798 |

**What it detects:** A value that looks like a placeholder copied from `.env.example` or documentation.

**Vulnerable code example:**

```python
API_KEY = "your-api-key-here"      # Copied placeholder
DATABASE_URL = "changeme"           # Placeholder
```

---

### SEC-002 — Low-entropy hardcoded secret

| Field | Value |
|-------|-------|
| Severity | CRITICAL |
| CWE | CWE-798 |

**What it detects:** A hardcoded secret with low entropy (likely generated carelessly by the AI agent).

**Example:** `SECRET = "abc123"` has much lower entropy than a real secret.

---

### SEC-003 — Embedded connection string

| Field | Value |
|-------|-------|
| Severity | CRITICAL |
| CWE | CWE-798 |

**What it detects:** Connection strings with embedded credentials.

**Vulnerable code example:**

```python
DATABASE_URL = "postgresql://admin:password123@db.example.com:5432/mydb"
MONGO_URI = "mongodb://root:secret@mongo:27017/app"
```

---

### SEC-004 — Sensitive env with default value

| Field | Value |
|-------|-------|
| Severity | HIGH |

**What it detects:** A sensitive environment variable with a hardcoded default value in the code.

**Vulnerable code example:**

```python
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-not-for-production")
```

---

### SEC-005 — Secret file not in gitignore (pending)

| Field | Value |
|-------|-------|
| Severity | HIGH |
| Status | **Deferred** — requires `.gitignore` analysis |

**What it detects:** Files that contain credentials or keys and are not listed in `.gitignore`.

**Typical files:** `.env`, `credentials.json`, `*.pem`, `*.key`

---

### SEC-006 — Value copied from env example

| Field | Value |
|-------|-------|
| Severity | CRITICAL |

**What it detects:** A value in the code that textually matches a value from the `.env.example` file.

**Example:** If `.env.example` has `API_KEY=sk-example-key-12345` and the code has `api_key = "sk-example-key-12345"`, vigil detects it.

---

## CAT-06: Test Quality

> **Status: IMPLEMENTED** — The `TestQualityAnalyzer` has been active since v0.5.0. All rules TEST-001 through TEST-006 are implemented. Supports pytest/unittest (Python) and jest/mocha (JavaScript/TypeScript).

Detects tests that provide false coverage — they pass but don't verify anything real. This is known as "test theater".

### TEST-001 — Test without assertions

| Field | Value |
|-------|-------|
| Severity | HIGH |

**What it detects:** A test function that contains no assert, verify, expect, or similar statement.

**Vulnerable code example:**

```python
def test_login():
    response = client.post("/login", json={"user": "admin", "pass": "123"})
    # No assert — the test always passes
```

---

### TEST-002 — Trivial assertion

| Field | Value |
|-------|-------|
| Severity | MEDIUM |

**What it detects:** An assert that only verifies trivial conditions such as `is not None` or `assertTrue(True)`.

**Vulnerable code example:**

```python
def test_user_exists():
    user = get_user(1)
    assert user is not None    # Trivial: does not verify the content
```

---

### TEST-003 — Assert catches all exceptions

| Field | Value |
|-------|-------|
| Severity | MEDIUM |

**What it detects:** Tests that use `except Exception: pass` or `except: pass`, hiding real errors.

**Vulnerable code example:**

```python
def test_complex_operation():
    try:
        result = complex_operation()
    except Exception:    # Catches everything, the test never fails
        pass
```

---

### TEST-004 — Skipped test without reason

| Field | Value |
|-------|-------|
| Severity | LOW |

**What it detects:** Tests marked with `@pytest.mark.skip` or `@unittest.skip` without a `reason` argument.

---

### TEST-005 — No status code assertion in API test

| Field | Value |
|-------|-------|
| Severity | MEDIUM |

**What it detects:** Tests that make HTTP requests but do not verify the response status code.

---

### TEST-006 — Mock mirrors implementation

| Field | Value |
|-------|-------|
| Severity | MEDIUM |

**What it detects:** Mocks whose return value is exactly the value the test expects, creating a circular test that does not verify any real logic.

**Vulnerable code example:**

```python
def test_calculate():
    with patch("app.calculate") as mock:
        mock.return_value = 42        # The mock returns 42
        result = app.calculate(6, 7)
        assert result == 42           # ...and the test expects 42. Nothing was tested.
```
