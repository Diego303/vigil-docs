---
title: "Output Formats"
description: "Human, JSON, JUnit XML, and SARIF 2.1.0 — available report formats."
order: 6
icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"
---

vigil supports 4 output formats to fit different workflows: interactive terminal, automation, CI dashboards, and security platforms.

## Format selection

```bash
# Human format (default)
vigil scan src/

# JSON format
vigil scan src/ -f json

# JUnit XML format
vigil scan src/ -f junit

# SARIF 2.1.0 format
vigil scan src/ -f sarif
```

---

## Human

Default format, optimized for terminal reading. Includes ANSI colors, severity icons, and a final summary.

### Severity icons

| Icon | Severity | Color |
|------|----------|-------|
| `✗` | CRITICAL | Red |
| `✗` | HIGH | Red |
| `⚠` | MEDIUM | Yellow |
| `~` | LOW | Blue |
| `i` | INFO | Cyan |

### Example output

```
  vigil v0.6.0 — scanning 42 files...

  ✗ CRITICAL  DEP-001  requirements.txt:14
    Package 'python-jwt-utils' does not exist in pypi.
    → Suggestion: Remove 'python-jwt-utils' and find the correct package name.
    | python-jwt-utils==1.0.0

  ✗ HIGH      AUTH-005  src/main.py:8
    CORS configured with '*' allowing requests from any origin.
    → Suggestion: Restrict CORS to specific trusted origins.

  ─────────────────────────────────────────────────
  42 files scanned in 1.2s
  2 findings: 1 critical, 1 high
  2 analyzers: dependency ✓, auth ✓
```

### Clean output (no findings)

```
  vigil v0.6.0 — scanning 42 files...

  No findings.

  ─────────────────────────────────────────────────
  42 files scanned in 0.5s
  0 findings
  2 analyzers: dependency ✓, auth ✓
```

### Colors

- Colors are automatically enabled when stdout is a TTY (interactive terminal).
- If stdout is a pipe or a file, colors are automatically disabled.
- You can control this with the `output.colors` config option.

### Snippets

If a finding includes a `snippet` (code fragment), it is displayed below the suggestion with the `|` prefix.

### Quiet mode

With `output.quiet: true` (or the equivalent config), the human format suppresses the header and summary, showing only findings and errors. Useful for integrations that only need the list of issues.

### Behavior with `--output`

When using `--output` with human format, the report is written to both the file and the terminal. This allows saving the report without losing immediate feedback.

---

## JSON

Structured format for programmatic processing, integration with other tools, or storage.

### Structure

```json
{
  "version": "0.6.0",
  "files_scanned": 42,
  "duration_seconds": 1.2,
  "analyzers_run": ["dependency", "auth"],
  "findings_count": 2,
  "findings": [
    {
      "rule_id": "DEP-001",
      "category": "dependency",
      "severity": "critical",
      "message": "Package 'python-jwt-utils' does not exist in pypi.",
      "location": {
        "file": "requirements.txt",
        "line": 14,
        "column": null,
        "end_line": null,
        "snippet": "python-jwt-utils==1.0.0"
      },
      "suggestion": "Remove 'python-jwt-utils' and find the correct package name.",
      "metadata": {}
    }
  ],
  "summary": {
    "files_scanned": 42,
    "total_findings": 2,
    "duration_seconds": 1.2,
    "analyzers_run": ["dependency", "auth"],
    "by_severity": {
      "critical": 1,
      "high": 1
    },
    "by_category": {
      "dependency": 1,
      "auth": 1
    },
    "by_rule": {
      "DEP-001": 1,
      "AUTH-005": 1
    },
    "by_file": {
      "requirements.txt": 1,
      "src/main.py": 1
    },
    "has_blocking": true,
    "errors": []
  },
  "errors": []
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | vigil version |
| `files_scanned` | int | Number of files analyzed |
| `duration_seconds` | float | Scan duration in seconds |
| `analyzers_run` | array | List of analyzers executed |
| `findings_count` | int | Total number of findings |
| `findings` | array | List of findings (empty if no issues) |
| `summary` | object | Statistical summary (severity, category, rule, top 10 files) |
| `errors` | array | Analyzer execution errors |

### Each finding

| Field | Type | Description |
|-------|------|-------------|
| `rule_id` | string | Unique rule ID (e.g., `DEP-001`) |
| `category` | string | Category: `dependency`, `auth`, `secrets`, `test-quality` |
| `severity` | string | `critical`, `high`, `medium`, `low`, `info` |
| `message` | string | Description of the issue |
| `location` | object | Location in the code (includes `snippet` only if present) |
| `suggestion` | string\|null | Fix suggestion |
| `metadata` | object | Additional rule-specific data |

### Typical usage

```bash
# Generate and process with jq
vigil scan src/ -f json | jq '.findings[] | select(.severity == "critical")'

# Save to file
vigil scan src/ -f json -o report.json

# Integrate with scripts
vigil scan src/ -f json | python process_results.py
```

---

## JUnit XML

Format compatible with CI/CD dashboards (Jenkins, GitLab CI, Azure DevOps, etc.). Each finding is represented as a failed test case.

### Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="vigil" tests="2" failures="2" errors="0" time="1.200">
    <properties>
      <property name="vigil.version" value="0.6.0" />
      <property name="vigil.files_scanned" value="42" />
      <property name="vigil.analyzers" value="dependency,auth" />
    </properties>
    <testcase name="DEP-001: requirements.txt:14" classname="vigil.dependency">
      <failure type="error" message="Package 'python-jwt-utils' does not exist in pypi.">
Rule: DEP-001
Severity: critical
Category: dependency
File: requirements.txt:14
Suggestion: Remove 'python-jwt-utils' and find the correct package name.
Snippet: python-jwt-utils==1.0.0
      </failure>
    </testcase>
    <testcase name="AUTH-005: src/main.py:8" classname="vigil.auth">
      <failure type="error" message="CORS configured with '*' allowing requests from any origin.">
Rule: AUTH-005
Severity: high
Category: auth
File: src/main.py:8
Suggestion: Restrict CORS to specific trusted origins.
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

### Severity mapping

| vigil severity | JUnit failure type |
|----------------|--------------------|
| CRITICAL | `error` |
| HIGH | `error` |
| MEDIUM | `warning` |
| LOW | `warning` |
| INFO | `warning` |

### Typical usage

```bash
# Generate JUnit report
vigil scan src/ -f junit -o report.xml
```

In **GitLab CI**, the report can be published as a test artifact:

```yaml
vigil:
  script:
    - vigil scan src/ -f junit -o report.xml
  artifacts:
    reports:
      junit: report.xml
```

In **Jenkins**, it can be used with the JUnit plugin:

```groovy
stage('Security Scan') {
    steps {
        sh 'vigil scan src/ -f junit -o report.xml'
    }
    post {
        always {
            junit 'report.xml'
        }
    }
}
```

---

## SARIF 2.1.0

Static Analysis Results Interchange Format. Industry-standard format for static analysis results. Compatible with GitHub Code Scanning, VS Code SARIF Viewer, and other platforms.

### Structure

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "vigil",
          "version": "0.6.0",
          "semanticVersion": "0.6.0",
          "informationUri": "https://github.com/Diego303/vigil-cli",
          "rules": [
            {
              "id": "DEP-001",
              "name": "HallucinatedDependency",
              "shortDescription": {
                "text": "Package declared as dependency does not exist in the public registry."
              },
              "defaultConfiguration": {
                "level": "error"
              },
              "helpUri": "https://github.com/Diego303/vigil-cli/docs/rules/DEP-001",
              "properties": {
                "cwe": "CWE-829",
                "owasp": "LLM03"
              }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "DEP-001",
          "ruleIndex": 0,
          "level": "error",
          "message": {
            "text": "Package 'python-jwt-utils' does not exist in pypi."
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "requirements.txt"
                },
                "region": {
                  "startLine": 14,
                  "snippet": {
                    "text": "python-jwt-utils==1.0.0"
                  }
                }
              }
            }
          ],
          "fixes": [
            {
              "description": {
                "text": "Remove 'python-jwt-utils' and find the correct package name."
              }
            }
          ]
        }
      ],
      "invocations": [
        {
          "executionSuccessful": true,
          "toolExecutionNotifications": []
        }
      ]
    }
  ]
}
```

### Severity mapping

| vigil severity | SARIF level |
|----------------|-------------|
| CRITICAL | `error` |
| HIGH | `error` |
| MEDIUM | `warning` |
| LOW | `note` |
| INFO | `note` |

### SARIF elements

- **`tool.driver.rules`**: Only includes rules that generated findings (not all 26 rules).
- **`tool.driver.semanticVersion`**: Semantic version of vigil.
- **`defaultConfiguration`**: Default level of the rule (`error`, `warning`, `note`).
- **`helpUri`**: URL to the rule documentation.
- **`ruleIndex`**: Numeric index referencing the rule position in `tool.driver.rules`.
- **`results`**: Each finding as an individual result with physical location.
- **`region.snippet`**: Code fragment, included if the finding has a snippet.
- **`fixes`**: If the finding has a suggestion, it is included as `fixes[].description`.
- **`invocations`**: Execution status and analyzer error notifications.
- **`properties.cwe`**: CWE reference if the rule has one.
- **`properties.owasp`**: OWASP reference if the rule has one.

### Usage with GitHub Code Scanning

```bash
# Generate SARIF
vigil scan src/ -f sarif -o vigil.sarif
```

In GitHub Actions:

```yaml
- name: Run vigil
  run: vigil scan src/ -f sarif -o vigil.sarif
  continue-on-error: true

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: vigil.sarif
```

Findings appear directly in the repository's "Security" tab and as annotations on pull requests.

---

## Format comparison

| Feature | Human | JSON | JUnit | SARIF |
|---------|-------|------|-------|-------|
| Terminal reading | Yes | No | No | No |
| Programmatic processing | No | Yes | Partial | Yes |
| Colors | Yes (TTY) | No | No | No |
| GitHub Code Scanning | No | No | No | Yes |
| CI dashboards | No | No | Yes | Yes |
| Fix suggestions | Yes | Yes | Yes | Yes |
| CWE references | No | No | No | Yes |
| Rule definitions | No | No | No | Yes |

---

## Combining formats

It is possible to generate multiple reports in a single run using scripts:

```bash
# Generate JSON and SARIF in one pass
vigil scan src/ -f json -o report.json
vigil scan src/ -f sarif -o vigil.sarif
vigil scan src/ -f junit -o report.xml
```

Since vigil caches registry responses, successive runs are fast because they don't repeat HTTP requests.
