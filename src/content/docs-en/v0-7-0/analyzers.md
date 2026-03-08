---
title: "Analyzers"
description: "Technical reference for implemented analyzers: DependencyAnalyzer, AuthAnalyzer, SecretsAnalyzer, and TestQualityAnalyzer."
order: 10
icon: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35"
---

vigil uses a modular analyzer system. Each analyzer focuses on a detection category and produces findings independently. This document describes the implemented analyzers.

For the general analyzer architecture (protocol, registration, flow), see [Architecture](/vigil-docs/en/docs/v0-7-0/architecture/).

---

## DependencyAnalyzer (CAT-01)

**Module:** `src/vigil/analyzers/deps/`
**Category:** `dependency`
**Active rules:** DEP-001, DEP-002, DEP-003, DEP-005, DEP-007

Detects hallucinated dependencies (slopsquatting), typosquatting, suspicious packages, nonexistent versions, and packages without a source repository.

### Supported dependency files

| File | Ecosystem | Parser |
|---------|------------|--------|
| `requirements.txt` | PyPI | `parse_requirements_txt()` |
| `requirements-dev.txt`, `requirements-*.txt` | PyPI | `parse_requirements_txt()` |
| `pyproject.toml` (`[project.dependencies]`, `[project.optional-dependencies]`) | PyPI | `parse_pyproject_toml()` |
| `package.json` (`dependencies`, `devDependencies`) | npm | `parse_package_json()` |

Files are discovered automatically with `find_and_parse_all()`, which traverses the directory tree avoiding `.venv/`, `node_modules/`, `.git/`, etc.

### Implemented rules

#### DEP-001 — Hallucinated dependency (CRITICAL)

Verifies that each declared package exists in the public registry (PyPI or npm). If it doesn't exist, it is very likely a name hallucinated by the AI agent.

```
# requirements.txt
flask==3.0.0
python-jwt-utils==1.0.0    # Does NOT exist on PyPI -> DEP-001 CRITICAL
```

**Requires network:** Yes. Skipped in `--offline` mode.

#### DEP-002 — Suspiciously new dependency (HIGH)

Checks the package creation date. If it was created less than `deps.min_age_days` days ago (default: 30), it may be a malicious package registered as part of a slopsquatting attack.

**Requires network:** Yes. Skipped in `--offline` mode.

#### DEP-003 — Typosquatting candidate (HIGH)

Compares each dependency name against a corpus of popular packages using normalized Levenshtein distance. If the similarity is >= `deps.similarity_threshold` (default: 0.85), it is a typosquatting candidate.

```
# requirements.txt
requets==2.31.0     # Similarity 0.875 with "requests" -> DEP-003 HIGH
```

**Requires network:** No. Works in `--offline` mode.

**Normalization:** For PyPI, hyphens (`-`), underscores (`_`), and dots (`.`) are treated as equivalent (PEP 503). `my-package`, `my_package`, and `my.package` are normalized to the same name before comparison.

**Corpus:** The files `data/popular_pypi.json` (5000 packages) and `data/popular_npm.json` (3454 packages) with real weekly download data are used. If these files are not available, a built-in corpus of ~236 PyPI packages and ~70 npm packages is used as fallback. The corpus can be regenerated with `python scripts/fetch_popular_packages.py`.

#### DEP-005 — No source repository (MEDIUM)

Verifies that the package has a source code repository linked in its metadata. Packages without a repository are harder to audit.

**Requires network:** Yes. Skipped in `--offline` mode.

#### DEP-007 — Nonexistent version (CRITICAL)

Verifies that the exact pinned version exists in the registry. Only applies to exact versions (`==1.2.3` in PyPI, `1.2.3` without prefix in npm).

```
# requirements.txt
flask==99.0.0     # Version does not exist -> DEP-007 CRITICAL
```

**Requires network:** Yes. Skipped in `--offline` mode.

### Deferred rules

| Rule | Reason | Estimate |
|-------|-------|------------|
| DEP-004 (unpopular) | Requires download statistics API, not available in basic PyPI/npm metadata | V1 or PHASE 6 |
| DEP-006 (missing import) | Requires AST import parser, out of scope for V0 (regex-based) | V1 |

### Analysis flow

1. **Discovery**: `find_and_parse_all()` traverses directories with `os.walk()` + pruning, searching for dependency files.
2. **Parsing**: Each file is parsed into a list of `DeclaredDependency` with name, version, source file, line, and ecosystem.
3. **Deduplication**: Duplicates are removed by name+ecosystem (e.g., same package in `requirements.txt` and `pyproject.toml`).
4. **Registry verification** (if online): For each unique package, PyPI/npm is queried via `RegistryClient`. DEP-001, DEP-002, DEP-005, DEP-007 are applied.
5. **Similarity verification** (always): For each unique package, similar popular package names are searched. DEP-003 is applied.

### Registry Client

The `RegistryClient` handles HTTP queries to PyPI and npm:

- **Disk cache:** `~/.cache/vigil/registry/` with individual JSON files per package.
- **Configurable TTL:** Default 24 hours (`deps.cache_ttl_hours`).
- **Lazy init:** The httpx client is created only on the first request.
- **Context manager:** Supports `with RegistryClient() as client:` for automatic cleanup.
- **Resilience:** Network errors assume the package exists (avoids false positives on unstable connections).

```bash
# Clear cache
rm -rf ~/.cache/vigil/registry/

# Force fresh requests
# (set cache_ttl_hours: 0 in .vigil.yaml)
```

### Relevant configuration

```yaml
deps:
  # Verify against registries (false = static checks only)
  verify_registry: true

  # Minimum age in days (DEP-002)
  min_age_days: 30

  # Similarity threshold for typosquatting (DEP-003)
  # 0.85 = catches 1-character typos in 8+ character names
  similarity_threshold: 0.85

  # Registry cache TTL
  cache_ttl_hours: 24

  # Offline mode (no HTTP)
  offline_mode: false
```

### Offline mode

With `--offline` or `deps.offline_mode: true`:

| Rule | Behavior |
|-------|---------------|
| DEP-001 | **Skipped** (requires registry verification) |
| DEP-002 | **Skipped** (requires creation date from registry) |
| DEP-003 | **Active** (local comparison against corpus) |
| DEP-005 | **Skipped** (requires registry metadata) |
| DEP-007 | **Skipped** (requires version list from registry) |

---

## AuthAnalyzer (CAT-02)

**Module:** `src/vigil/analyzers/auth/`
**Category:** `auth`
**Active rules:** AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-005, AUTH-006, AUTH-007

Detects insecure authentication and authorization patterns in Python (FastAPI/Flask) and JavaScript (Express) using regex pattern matching.

### Internal architecture

The analyzer is composed of 4 modules:

| Module | Responsibility |
|--------|----------------|
| `analyzer.py` | Orchestrates detection, iterates files and lines |
| `endpoint_detector.py` | Detects HTTP endpoints (decorators in Python, `app.get/post/...` in JS) |
| `middleware_checker.py` | Checks if an endpoint has auth middleware (`Depends(...)`, `passport`, etc.) |
| `patterns.py` | Regex patterns for JWT lifetime, hardcoded secrets, CORS, cookies, passwords |

```
AuthAnalyzer.analyze(files, config)
    |
    v
[1. Filter relevant files (.py, .js, .ts, .jsx, .tsx)]
    |
    v
[2. detect_endpoints(content)]  -->  List of EndpointInfo
    |                                 (path, method, line, framework)
    v
[3. check_endpoint_auth(ep)]  -->  AUTH-001 / AUTH-002 findings
    |
    v
[4. _check_lines() per line]
    +---> AUTH-003: Excessive JWT lifetime
    +---> AUTH-004: Hardcoded secret with low entropy
    +---> AUTH-005: CORS allow all origins
    +---> AUTH-006: Cookie without security flags
    +---> AUTH-007: Non timing-safe password comparison
    |
    v
  list[Finding]
```

### Implemented rules

| Rule | Severity | Requires network | Description |
|-------|-----------|-------------|-------------|
| AUTH-001 | HIGH | No | Sensitive endpoint without auth middleware |
| AUTH-002 | HIGH | No | Mutating endpoint (DELETE/PUT/PATCH) without auth |
| AUTH-003 | MEDIUM | No | JWT with excessive lifetime (>24h by default) |
| AUTH-004 | CRITICAL | No | Hardcoded JWT secret with low entropy |
| AUTH-005 | HIGH | No | CORS configured with `*` (allow all) |
| AUTH-006 | MEDIUM | No | Cookie without security flags (httpOnly, secure, sameSite) |
| AUTH-007 | MEDIUM | No | Password comparison with `==` (vulnerable to timing attacks) |

All rules are offline — they do not require network access. They only analyze source code.

### Endpoint detection

The `endpoint_detector` detects HTTP endpoints in three frameworks:

**FastAPI/Flask (Python):**
```python
@app.get("/users/{user_id}")        # Detected
@router.delete("/users/{user_id}")  # Detected
@app.route("/admin", methods=["POST"])  # Detected
```

**Express (JavaScript):**
```javascript
app.get("/users/:id", handler)       // Detected
router.delete("/users/:id", handler) // Detected
```

Auth middleware detection looks for:
- Python: `Depends(...)`, `login_required`, `@requires_auth`, `Permission`, `current_user`
- JavaScript: `passport`, `authenticate`, `isAuthenticated`, `requireAuth`, `authMiddleware`

### Sensitive endpoint heuristics (AUTH-001)

An endpoint is considered sensitive if its path contains tokens such as:
`user`, `admin`, `account`, `profile`, `payment`, `order`, `billing`, `settings`, `password`, `token`, `auth`, `session`, `dashboard`

### Relevant configuration

```yaml
auth:
  # Maximum JWT lifetime in hours (AUTH-003)
  max_token_lifetime_hours: 24

  # Require auth on mutating endpoints (AUTH-002)
  require_auth_on_mutating: true

  # Allow open CORS in dev/test files (AUTH-005)
  cors_allow_localhost: true
```

### Integration with SecretsAnalyzer

AUTH-004 (hardcoded JWT secret) uses `shannon_entropy()` from the `secrets/entropy.py` module to calculate the value's entropy. It only reports secrets with entropy < 4.0 bits/char (typical placeholders like `"supersecret"` or `"secret123"`). High-entropy secrets are left for SEC-002.

---

## SecretsAnalyzer (CAT-03)

**Module:** `src/vigil/analyzers/secrets/`
**Category:** `secrets`
**Active rules:** SEC-001, SEC-002, SEC-003, SEC-004, SEC-006

Detects poorly managed secrets and credentials in code, with emphasis on patterns typical of AI-generated code: copied placeholders, low-entropy secrets, and `.env.example` values embedded in source.

### Internal architecture

| Module | Responsibility |
|--------|----------------|
| `analyzer.py` | Orchestrates detection, applies per-line and per-file checks |
| `placeholder_detector.py` | Compiles placeholder regex, detects secret assignments |
| `entropy.py` | Calculates Shannon entropy to distinguish real secrets from placeholders |
| `env_tracer.py` | Parses `.env.example`, searches for copied values in source code |

```
SecretsAnalyzer.analyze(files, config)
    |
    v
[1. Compile placeholder_patterns (30 regex)]
    |
    v
[2. Load .env.example entries (if check_env_example=true)]
    |
    v
[3. For each relevant file (.py, .js, .ts, ...)]
    +---> SEC-006: find_env_values_in_code() against .env.example entries
    +---> SEC-003: Connection strings with credentials (postgresql://, mongodb://, etc.)
    +---> SEC-004: Sensitive env vars with hardcoded default
    +---> SEC-001: Secret assignment with placeholder value
    +---> SEC-002: Secret assignment with low entropy
    |
    v
  list[Finding]
```

### Implemented rules

| Rule | Severity | Description |
|-------|-----------|-------------|
| SEC-001 | CRITICAL | Placeholder value in code (`"your-api-key-here"`, `"changeme"`, etc.) |
| SEC-002 | CRITICAL | Hardcoded secret with low entropy (< 3.0 bits/char by default) |
| SEC-003 | CRITICAL | Connection string with embedded credentials (postgresql://, mongodb://, etc.) |
| SEC-004 | HIGH | Sensitive environment variable with hardcoded default value in code |
| SEC-006 | CRITICAL | Value copied verbatim from `.env.example` to source code |

### Deferred rule

| Rule | Reason | Estimate |
|-------|-------|------------|
| SEC-005 (file not in gitignore) | Requires `.gitignore` analysis with glob patterns | V1 or later PHASE |

### Placeholder detection (SEC-001)

The analyzer comes with **30 regex patterns** of known placeholders, configurable via `secrets.placeholder_patterns`:

- Generic values: `changeme`, `TODO`, `FIXME`, `placeholder`, `xxx+`
- Template patterns: `your-*-here`, `replace-me`, `insert-*-here`, `put-*-here`, `add-*-here`
- API key prefixes: `sk-your*`, `pk_test_*`, `sk_test_*`, `sk_live_test*`
- Typical AI values: `secret123`, `password123`, `supersecret`, `mysecret`, `my-secret-key`
- Example values: `example.com`, `test-key`, `dummy-key`, `fake-key`, `sample-key`, `default-secret`

### Shannon entropy (SEC-002)

Low-entropy secret detection uses Shannon entropy calculation:

- `"password123"` → ~2.8 bits/char (placeholder)
- `"xK8$mP2!qR"` → ~3.3 bits/char (borderline)
- `"a1b2c3d4e5f6g7h8"` → ~4.0 bits/char (probably real)

The default threshold is 3.0 bits/char. It is configured with `secrets.min_entropy`.

### Connection string detection (SEC-003)

Supported protocols: `postgresql`, `postgres`, `mysql`, `mariadb`, `mongodb`, `mongodb+srv`, `redis`, `amqp`, `rabbitmq`, `sqlserver`, `mssql`.

```python
# Detected
DATABASE_URL = "postgresql://admin:password123@db.example.com:5432/mydb"

# NOT detected (uses environment variable in the password)
DATABASE_URL = f"postgresql://admin:${DB_PASS}@db.example.com:5432/mydb"
```

In output snippets, the password is automatically redacted: `postgresql://admin:***@db.example.com:5432/mydb`.

### Env defaults detection (SEC-004)

Detects sensitive environment variables with hardcoded default values:

```python
# Python — detected
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")
API_KEY = os.environ.get("API_KEY", "test-key-123")

# JavaScript — detected
const secret = process.env.SECRET_KEY || "mysecret"
const key = process.env["API_KEY"] || "default-key"
```

Only reports if the variable name contains sensitive tokens: `SECRET`, `KEY`, `TOKEN`, `PASSWORD`, `API_KEY`, `AUTH`, `JWT`, `DATABASE_URL`, `DB_PASS`, `PRIVATE_KEY`, `ENCRYPTION`, `SIGNING`, `STRIPE`, `AWS`.

### .env.example tracing (SEC-006)

If `secrets.check_env_example: true` (default), the analyzer:

1. Searches for `.env.example`, `.env.sample`, `.env.template` files in root directories.
2. Parses each file extracting `KEY=value` pairs.
3. Searches for those exact values in source code.
4. If a value from `.env.example` appears in a `.py` or `.js` file, it generates SEC-006 CRITICAL.

### Relevant configuration

```yaml
secrets:
  # Minimum Shannon entropy for SEC-002
  min_entropy: 3.0

  # Compare with .env.example for SEC-006
  check_env_example: true

  # Placeholder regex patterns for SEC-001
  # (list of 30 default patterns — see schema.py)
  placeholder_patterns:
    - "changeme"
    - "your-.*-here"
    - "replace-?me"
    # ... (30 default patterns)
```

---

## TestQualityAnalyzer (CAT-06)

**Module:** `src/vigil/analyzers/tests/`
**Category:** `test-quality`
**Active rules:** TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006

Detects test theater — tests that pass but don't verify anything real. Supports pytest/unittest (Python) and jest/mocha (JavaScript/TypeScript).

### Internal architecture

| Module | Responsibility |
|--------|----------------|
| `analyzer.py` | Orchestrates detection, iterates test files and functions |
| `assert_checker.py` | Extracts test functions, counts assertions, detects trivial ones, catch-all, skips, API tests |
| `mock_checker.py` | Detects mock return values and cross-references them with assertions to find mirrors |
| `coverage_heuristics.py` | Identifies test files and detects framework (pytest, jest, mocha) |

```
TestQualityAnalyzer.analyze(files, config)
    |
    v
[1. Filter test files (.py with test_, .test.js, .spec.ts, etc.)]
    |
    v
[2. TEST-004: find_skips_without_reason() — global analysis]
    |
    v
[3. Extract test functions]
    +---> Python: extract_python_test_functions() (indentation)
    +---> JS: extract_js_test_functions() (brace counting)
    |
    v
[4. For each function (skipping skipped ones):]
    +---> TEST-001: count_assertions() < min_assertions_per_test
    +---> TEST-002: find_trivial_assertions() (only if ALL are trivial)
    +---> TEST-003: find_catch_all_exceptions()
    +---> TEST-005: is_api_test() && !has_status_code_assertion()
    +---> TEST-006: find_mock_mirrors()
    |
    v
  list[Finding]
```

### Implemented rules

| Rule | Severity | Description |
|-------|-----------|-------------|
| TEST-001 | HIGH | Test without assertions (only verifies that the code doesn't crash) |
| TEST-002 | MEDIUM | Trivial assertions (`assert True`, `assert x is not None`, `toBeTruthy()`) |
| TEST-003 | MEDIUM | Catch-all exceptions (`except Exception: pass`, `catch(e)`) |
| TEST-004 | LOW | Skipped test without reason (`@pytest.mark.skip`, `test.skip`, `xit`) |
| TEST-005 | MEDIUM | API test without verifying status code |
| TEST-006 | MEDIUM | Mock mirror (mock returns literal that matches assertion) |

All rules are offline — they do not require network access.

### Test function detection

**Python:**
- `def test_*():` and `async def test_*():` (functions and class methods)
- Single-line: `def test_x(): assert True`
- End of body determined by indentation

**JavaScript:**
- `test('name', () => { ... })` and `it('name', () => { ... })`
- End of body determined by brace `{}` counting

### Triviality heuristic (TEST-002)

Only reported when **all** assertions in a test are trivial. If there is at least one real assertion mixed with trivial ones, no finding is generated.

Trivial Python patterns: `assert True`, `assert x` (bare), `assert x is not None`, `assert x is None`, `assertTrue(True)`, `assertIsNotNone(x)`, `assertIsNone(x)`

Trivial JavaScript patterns: `toBeTruthy()`, `toBeDefined()`, `not.toBeNull()`, `not.toBeUndefined()`, `toBe(true)`

### Mock mirrors (TEST-006)

Only detects literal values (numbers, strings, booleans, None/null). Complex values (functions, lists, dicts) are ignored to avoid false positives.

```python
# DETECTED — mock mirror
mock_calc.return_value = 42
result = get_price()
assert result == 42    # Only tests that the mock works

# NOT DETECTED — different values
mock_data.return_value = 10
result = transform()
assert result == 20    # Tests real logic
```

### Relevant configuration

```yaml
tests:
  # Minimum assertions per test (TEST-001)
  min_assertions_per_test: 1

  # Detect trivial assertions (TEST-002)
  detect_trivial_asserts: true

  # Detect mock mirrors (TEST-006)
  detect_mock_mirrors: true
```
