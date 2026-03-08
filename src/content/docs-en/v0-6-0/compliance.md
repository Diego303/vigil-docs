---
title: "Compliance & Enterprise Usage"
description: "Alignment with OWASP, CRA, SOC 2, ISO 27001, NIST, and enterprise pipeline usage."
order: 13
icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
---

This document describes how vigil aligns with compliance frameworks and how to integrate it into enterprise environments that use AI agents to generate code.

---

## Why vigil in an enterprise environment

Organizations adopting AI agents (Copilot, Cursor, Claude Code, ChatGPT) to generate code face new risks that traditional SAST tools do not cover:

1. **Supply chain via hallucinations**: Agents invent package names. An attacker can register that name with malware.
2. **Example secrets in production**: Agents copy values from documentation (`"your-api-key-here"`) that end up in production.
3. **Auth without controls**: Agents generate functional endpoints but without authentication middleware.
4. **Cosmetic tests**: Agents generate tests that pass but do not verify anything real.

vigil detects these 4 patterns in a **deterministic, auditable way with no dependency on external AI APIs**.

---

## Alignment with compliance frameworks

### OWASP Top 10 for LLM Applications (2025)

vigil directly aligns with 3 categories of the OWASP Top 10 for LLM Applications:

| OWASP Category | vigil rules | Coverage |
|----------------|-------------|----------|
| **LLM02** — Sensitive Information Disclosure | SEC-001, SEC-002, SEC-003, SEC-004, SEC-006, AUTH-004 | Detects hardcoded secrets, placeholders, connection strings with credentials |
| **LLM03** — Supply Chain Vulnerabilities | DEP-001, DEP-002, DEP-003, DEP-005, DEP-007 | Detects hallucinated dependencies, typosquatting, suspiciously new packages |
| **LLM06** — Excessive Agency | AUTH-001, AUTH-002, AUTH-005, AUTH-006 | Detects endpoints without auth, permissive CORS, insecure cookies |

### EU Cyber Resilience Act (CRA)

The CRA requires that products with digital components are secure "by design". vigil contributes to:

| CRA Requirement | How vigil contributes |
|-----------------|----------------------|
| Vulnerability management in third-party components | DEP-001 to DEP-007 verify that dependencies exist, are legitimate, and are not typosquatting |
| Protection of stored and in-transit data | SEC-001 to SEC-006 detect hardcoded credentials that compromise data |
| Adequate access control | AUTH-001 to AUTH-007 detect endpoints without authentication and permissive configurations |
| Adequate testing | TEST-001 to TEST-006 detect tests that verify nothing (since v0.6.0) |

### SOC 2 Type II

| Trust Service Criteria | Relevant vigil rules |
|------------------------|----------------------|
| **CC6.1** — Logical access controls | AUTH-001, AUTH-002, AUTH-005, AUTH-006 |
| **CC6.6** — External threats | DEP-001, DEP-002, DEP-003 (supply chain) |
| **CC6.7** — Credential management | AUTH-004, SEC-001, SEC-002, SEC-003, SEC-004, SEC-006 |
| **CC7.1** — Vulnerability management | All DEP- rules for supply chain |

### ISO 27001:2022

| Control | Relevant vigil rules |
|---------|----------------------|
| **A.8.25** — Secure development lifecycle | Integrate vigil in CI/CD as a quality gate |
| **A.8.26** — Application security requirements | AUTH-001 to AUTH-007 verify access controls |
| **A.8.28** — Secure coding | SEC-001 to SEC-006 detect secrets in code |

### NIST Cybersecurity Framework (CSF) 2.0

| Function | Category | vigil rules |
|----------|----------|-------------|
| **Identify** | Asset Management | DEP-001 to DEP-007 (dependency inventory) |
| **Protect** | Access Control | AUTH-001 to AUTH-007 |
| **Protect** | Data Security | SEC-001 to SEC-006 |
| **Detect** | Continuous Monitoring | Integrate vigil in CI/CD pipelines |

---

## Integration in enterprise pipelines

### Recommended pipeline

```
AI-generated code
    |
    v
[1. vigil scan]          <- Detects AI-specific patterns
    |
    v
[2. Semgrep/Bandit]      <- General-purpose SAST
    |
    v
[3. Snyk/Dependabot]     <- CVEs in dependencies
    |
    v
[4. Gitleaks]            <- Real leaked secrets
    |
    v
[5. Tests + Coverage]    <- Functional quality
    |
    v
Deploy
```

vigil complements (does not replace) existing tools. Its unique value lies in detecting issues **specific to AI-generated code**.

### Strategy by environment

| Environment | Strategy | `--fail-on` | Notes |
|-------------|----------|-------------|-------|
| Local development | `relaxed` | `critical` | Fast feedback without blocking |
| CI/CD (feature branch) | `standard` | `high` | Balance between speed and security |
| CI/CD (main/release) | `strict` | `medium` | Maximum rigor before production |
| Security audit | `strict` | `low` | Complete report for analysis |

### GitHub Actions example (production)

```yaml
- name: Security scan (AI-specific)
  run: |
    pip install vigil-ai-cli
    vigil scan src/ \
      --format sarif \
      --output results/vigil.sarif \
      --fail-on medium \
      --config .vigil.strict.yaml

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results/vigil.sarif
```

### SARIF format for security platforms

vigil produces reports in SARIF 2.1.0, compatible with:

- GitHub Code Scanning (native)
- GitLab Security Dashboard
- Azure DevOps
- SonarQube (via importer)
- Defect Dojo
- Snyk (via SARIF importer)

Each finding includes `ruleId`, `level`, `location`, and optionally `fixes` with fix suggestions.

---

## Reports for audits

### Generate a complete JSON report

```bash
vigil scan src/ --format json --output audit-report.json
```

The JSON report includes:
- `findings`: Complete list of findings with rule_id, severity, message, location, suggestion
- `findings_count`: Total number of findings
- `files_scanned`: Files analyzed
- `duration_seconds`: Execution time
- `analyzers_run`: Analyzers executed
- `errors`: Errors during analysis (if any)
- `version`: vigil version used

### Generate a SARIF report with CWE references

```bash
vigil scan src/ --format sarif --output audit-report.sarif
```

The SARIF report maps each rule to CWEs when applicable:

| CWE | Name | vigil rules |
|-----|------|-------------|
| CWE-306 | Missing Authentication for Critical Function | AUTH-001 |
| CWE-208 | Observable Timing Discrepancy | AUTH-007 |
| CWE-614 | Sensitive Cookie Without 'Secure' | AUTH-006 |
| CWE-798 | Hard-coded Credentials | AUTH-004, SEC-001, SEC-002, SEC-003 |
| CWE-829 | Inclusion of Untrusted Functionality | DEP-001, DEP-003 |
| CWE-862 | Missing Authorization | AUTH-002 |
| CWE-942 | Permissive Cross-domain Policy | AUTH-005 |

---

## Privacy and security of vigil

vigil is designed to be safe in enterprise environments:

- **No telemetry**: Does not send data to external servers.
- **Deterministic**: Does not use AI, ML, or external inference APIs.
- **Limited HTTP**: Only makes GET requests to public PyPI/npm APIs to verify package existence. Disabled with `--offline`.
- **Local cache**: Registry responses are cached in `~/.cache/vigil/registry/` (does not contain project data).
- **Auditable**: Every rule is a pattern defined in code. No black boxes.
- **No side effects**: vigil only reads files. It never modifies code, sends messages, or creates resources.

### Air-gapped mode

For environments without internet access:

```bash
vigil scan src/ --offline
```

In offline mode, only static checks are executed (typosquatting by similarity, auth patterns, secrets). Rules that require registry verification (DEP-001, DEP-002, DEP-005, DEP-007) are automatically skipped.

---

## Enterprise FAQ

### Does vigil replace Semgrep/Snyk/SonarQube?

No. vigil detects patterns **specific to AI-generated code** that other tools do not cover. It is complementary:

| Problem | vigil | Semgrep | Snyk | Gitleaks |
|---------|-------|---------|------|----------|
| Hallucinated package (does not exist) | Yes | No | No | No |
| Typosquatting | Yes | No | Partial | No |
| Placeholder secret (`"changeme"`) | Yes | Partial | No | No |
| Real leaked secret | No | No | No | Yes |
| Known CVE in dependency | No | No | Yes | No |
| SQL injection | No | Yes | No | No |

### How long does a scan take?

vigil is fast because it does not perform AI inference. A typical scan:
- 100 files: < 1 second (offline), < 5 seconds (with registry verification)
- 1000 files: < 5 seconds (offline), < 30 seconds (with cold cache)

### Can it be used in monorepos?

Yes. vigil supports multiple paths and file discovery automatically prunes directories like `node_modules/`, `.venv/`, etc.

```bash
vigil scan services/auth/ services/api/ libs/shared/
```

### How to exclude false positives?

Two options:

1. **Disable the rule** for the entire project:
```yaml
rules:
  AUTH-005:
    enabled: false
```

2. **Change the severity** so it does not block:
```yaml
rules:
  AUTH-005:
    severity: "low"
```
