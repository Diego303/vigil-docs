---
title: "Security"
description: "Threat model, OWASP alignment, CWE references, and vigil limitations."
order: 9
icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
---

# Security

This document describes vigil's threat model, what it detects, how it aligns with industry standards, and what its limitations are.

## Problem that vigil solves

AI agents (Copilot, Cursor, Claude Code, ChatGPT, etc.) generate code that passes superficial human review but contains dangerous security patterns:

1. **Hallucinated dependencies (slopsquatting)**: The agent invents package names that do not exist. An attacker registers that name with malicious code. When someone runs `pip install` or `npm install`, they install the attacker's package.

2. **Insecure auth patterns**: Endpoints without authentication, open CORS, JWT with placeholder secrets, cookies without security flags.

3. **Secrets copied from examples**: The agent copies values from `.env.example`, uses placeholders like "your-api-key-here", or generates secrets with low entropy.

4. **Tests that verify nothing**: Tests without assertions, trivial assertions (`assert x is not None`), mocks that replicate the implementation.

These problems are **specific to AI-generated code** and are not detected by traditional SAST tools (Semgrep, Bandit, ESLint) because:

- SAST tools do not verify that packages exist in registries.
- They do not detect slopsquatting or hallucinated dependencies.
- They do not evaluate the actual quality of tests.
- They do not compare values against `.env.example`.

---

## Threat model

### Threat actors

| Actor | Motivation | Vector |
|-------|------------|--------|
| AI agent | Generates plausible but insecure code | Hallucinations, patterns copied from examples |
| Slopsquatting attacker | Compromise dependencies | Register hallucinated package names |
| Typosquatting attacker | Compromise dependencies | Register names similar to popular packages |
| Inexperienced developer | Accept agent code without review | Excessive trust in agent output |

### Attack surface

1. **Supply chain (dependencies)**: The dependency file is the most critical attack surface. A single malicious package can compromise the entire system.

2. **Source code**: Insecure auth patterns, hardcoded secrets, permissive configurations.

3. **Tests**: False coverage that gives a sense of security without verifying anything real.

### Typical attack flow

```
1. Developer asks the AI agent: "Create a REST API with JWT authentication"
2. The agent generates code with:
   - A package that does not exist ("python-jwt-utils")
   - Hardcoded JWT secret ("supersecret123")
   - CORS with allow_origins=["*"]
   - Tests without real assertions
3. The developer superficially reviews and approves the PR
4. An attacker registers "python-jwt-utils" on PyPI with malware
5. On the next `pip install`, the malicious package is installed
```

vigil detects all 4 issues from step 2. Since v0.5.0, all four analyzers are active: Dependency (DEP), Auth (AUTH), Secrets (SEC), and Test Quality (TEST).

---

## OWASP alignment

vigil aligns with the **OWASP Top 10 for LLM Applications (2025)**:

### LLM02 — Sensitive Information Disclosure

**What vigil covers:**
- SEC-001: Placeholder secrets in code
- SEC-002: Low-entropy secrets
- SEC-003: Connection strings with credentials
- SEC-004: Environment variables with sensitive defaults
- SEC-005: Secret files outside .gitignore
- SEC-006: Values copied from .env.example
- AUTH-004: Hardcoded JWT secrets

**Connection with LLMs:** AI agents frequently copy example values from documentation or generate predictable secrets when a user asks "create a database configuration" or "generate a JWT token".

### LLM03 — Supply Chain Vulnerabilities

**What vigil covers:**
- DEP-001: Hallucinated dependencies (slopsquatting)
- DEP-002: Suspiciously new dependencies
- DEP-003: Typosquatting
- DEP-004: Unpopular dependencies
- DEP-005: Dependencies without a source repository
- DEP-006: Imports not declared in dependencies
- DEP-007: Nonexistent versions

**Connection with LLMs:** This is vigil's main contribution. LLMs generate package names that sound plausible but do not exist ("python-jwt-utils", "fast-json-parser", "express-auth-middleware"). No other scanner verifies this.

### LLM06 — Excessive Agency

**What vigil covers:**
- AUTH-001: Sensitive endpoints without authentication
- AUTH-002: Destructive endpoints without authorization
- AUTH-005: Permissive CORS
- AUTH-006: Cookies without security flags

**Connection with LLMs:** AI agents generate functional endpoints but without the necessary access controls. When an agent creates a DELETE endpoint, it rarely adds authorization verification.

---

## CWE references

vigil maps its rules to Common Weakness Enumerations (CWE) when applicable:

| CWE | Name | vigil rules |
|-----|------|-------------|
| CWE-306 | Missing Authentication for Critical Function | AUTH-001 |
| CWE-208 | Observable Timing Discrepancy | AUTH-007 |
| CWE-614 | Sensitive Cookie Without 'Secure' | AUTH-006 |
| CWE-798 | Hard-coded Credentials | AUTH-004, SEC-001, SEC-002, SEC-003 |
| CWE-829 | Inclusion of Untrusted Functionality | DEP-001, DEP-003 |
| CWE-862 | Missing Authorization | AUTH-002 |
| CWE-942 | Permissive Cross-domain Policy | AUTH-005 |

CWE references are included in SARIF reports for integration with security platforms that use CWE as a taxonomy.

---

## What vigil is NOT

It is important to understand vigil's limitations:

### vigil does not replace:

| Tool | Purpose | Complementarity |
|------|---------|-----------------|
| **Semgrep/Bandit** | General-purpose SAST | vigil complements with AI-specific checks |
| **Snyk/Dependabot** | Known vulnerabilities (CVE) | vigil detects packages that DO NOT exist, Snyk detects vulnerabilities in packages that DO exist |
| **Gitleaks/TruffleHog** | Detection of real secrets (API keys, tokens) | vigil detects placeholders and low-entropy secrets |
| **SonarQube** | General code quality | vigil focuses on AI-specific patterns |

### vigil does not detect:

- **Known CVE vulnerabilities**: Use Snyk, Dependabot, or `pip-audit` for that.
- **Generic SQL injection/XSS**: Use Semgrep or Bandit for that.
- **Real leaked secrets**: Use Gitleaks or TruffleHog for that.
- **Vulnerabilities in compiled code**: vigil only analyzes source code.
- **Business logic issues**: vigil looks for patterns, it does not understand logic.
- **Code in unsupported languages**: Currently only Python and JavaScript/TypeScript.

### vigil does not use AI

vigil is **deterministic**. It does not use LLMs, machine learning models, or statistical heuristics. Each rule is a defined pattern with explicit logic. This has advantages and disadvantages:

**Advantages:**
- Reproducible results: the same code always produces the same findings.
- No random false positives.
- No dependency on external AI APIs.
- Fast: no inference latency.
- Auditable: each rule is inspectable.

**Disadvantages:**
- Cannot detect novel problems that were not anticipated in the rules.
- Less flexible than a model that "understands" context.
- Patterns must be updated manually.

---

## Security of vigil as a tool

### HTTP requests

vigil makes HTTP requests to public registries (PyPI, npm) to verify the existence of packages. These requests:

- Are only read-only GET requests to the public APIs of PyPI (`pypi.org/pypi/{name}/json`) and npm (`registry.npmjs.org/{name}`).
- Do not send project data (except package names).
- Can be completely disabled with `--offline`.
- Are cached locally at `~/.cache/vigil/registry/` with a configurable TTL (default 24h).
- Network errors **assume the package exists** to avoid false positives on unstable connections.
- The HTTP client uses `httpx` with a 10-second timeout and reuses connections.

### Cache

The cache is stored as individual JSON files on the local filesystem:

- Location: `~/.cache/vigil/registry/`
- Content: public package metadata (name, version, publication date, downloads).
- TTL: 24 hours by default (configurable).
- Does not contain sensitive project data.

### No telemetry

vigil does not send telemetry, metrics, or usage data to any server. Everything runs locally.

### vigil's dependencies

vigil depends on trusted and well-established packages:

| Package | Purpose | Weekly downloads |
|---------|---------|------------------|
| click | CLI framework | 50M+ |
| pydantic | Config validation | 40M+ |
| httpx | HTTP client | 20M+ |
| structlog | Structured logging | 5M+ |
| pyyaml | YAML parser | 50M+ |

---

## Security recommendations

### For teams using AI agents

1. **Run vigil in CI**: Automate scanning on every PR so no AI-generated code reaches production without verification.

2. **Do not trust the agent for dependencies**: Always manually verify that suggested packages exist and are the correct ones.

3. **Review generated secrets**: Agents frequently generate placeholder secrets. Make sure environment variables are loaded from a real `.env` and not from default values.

4. **Verify generated tests**: AI-generated tests tend to be superficial. Use `vigil tests` to detect tests without real assertions.

5. **Configure fail-on based on environment**: Use `--fail-on critical` in local development and `--fail-on medium` in production CI.

### For security administrators

1. **Use SARIF format**: Integrate vigil with GitHub Code Scanning or security platforms that support SARIF.

2. **Combine with other tools**: vigil complements but does not replace SAST, SCA, and secret scanning. A complete pipeline includes:
   - vigil (AI-specific patterns)
   - Semgrep/Bandit (general-purpose SAST)
   - Snyk/Dependabot (CVEs in dependencies)
   - Gitleaks (real leaked secrets)

3. **Audit the cache periodically**: Clean `~/.cache/vigil/registry/` if you suspect corrupt or stale data.

4. **Use strict strategy for compliance**: The `strict` strategy aligns thresholds with SOC 2, ISO 27001, and EU CRA requirements.
