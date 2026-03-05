---
title: "Installation"
description: "System requirements and installation methods for Sentinel."
order: 2
icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
---

# Installation

Sentinel is distributed as a standard Python package with no native dependencies. It works on any operating system with Python 3.9 or higher.

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Python** | 3.9 | 3.11+ |
| **pip** | 21.0 | Latest version |
| **OS** | Linux, macOS, Windows | Linux / macOS |
| **Memory** | 256 MB | 512 MB |
| **Disk** | 50 MB | 100 MB |

> **Note on Windows**: Sentinel works on Windows, but WSL2 is recommended for optimal performance and full Git hooks compatibility.

## Installation Methods

### pip (Recommended)

The most straightforward method. Installs Sentinel in your current Python environment:

```bash
pip install sentinel-ai
```

To install in a virtual environment (recommended for projects):

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

pip install sentinel-ai
```

### pipx (Isolated Global Installation)

If you want Sentinel globally available without polluting your Python environment:

```bash
# Install pipx if you don't have it
pip install pipx
pipx ensurepath

# Install Sentinel
pipx install sentinel-ai
```

Benefits of pipx:
- Sentinel is available as a global command
- Doesn't interfere with other Python packages
- Easy to update and uninstall

### From Source

For development, contributions, or access to unreleased features:

```bash
git clone https://github.com/Diego303/sentinel-cli.git
cd sentinel
pip install -e ".[dev]"
```

This installs Sentinel in editable mode (`-e`) with development dependencies included (pytest, mypy, ruff, etc.).

### Docker

For CI/CD environments or if you prefer not to install Python:

```bash
docker pull ghcr.io/sentinel/sentinel:latest

# Scan a local directory
docker run --rm -v $(pwd):/workspace ghcr.io/sentinel/sentinel:latest \
  scan /workspace/src/ --format human
```

## Verification

Confirm the installation was successful by running these commands:

```bash
# Check version
sentinel --version
# sentinel v0.1.0

# Verify rules are loaded
sentinel rules
# Available rules: 7
#   DEP-001  Dependency Hallucination     [critical]
#   DEP-002  New Package Alert            [warning]
#   SEC-001  Over-Permission              [critical]
#   SEC-002  Permissive CORS              [warning]
#   SEC-003  Hardcoded Secrets            [critical]
#   TEST-001 Test Theater                 [warning]
#   TEST-002 Mirror Mock                  [info]

# Run a test scan
sentinel scan . --format human
```

## Updating

### Update to the latest version

```bash
# With pip
pip install --upgrade sentinel-ai

# With pipx
pipx upgrade sentinel-ai

# With Docker
docker pull ghcr.io/sentinel/sentinel:latest
```

### Pin a specific version

In your `requirements.txt` or `pyproject.toml`:

```
# requirements.txt
sentinel-ai==0.1.0
```

```toml
# pyproject.toml
[project.optional-dependencies]
security = ["sentinel-ai>=0.1.0,<1.0.0"]
```

## Uninstalling

```bash
# With pip
pip uninstall sentinel-ai

# With pipx
pipx uninstall sentinel-ai
```

## Troubleshooting

### `command not found: sentinel`

The binary is not in your `PATH`. Solutions:

```bash
# Check where it was installed
pip show sentinel-ai | grep Location

# Add to PATH (Linux/macOS)
export PATH="$HOME/.local/bin:$PATH"
```

### Python version conflicts

If you have multiple Python versions, make sure you're using the right one:

```bash
# Use python3 explicitly
python3 -m pip install sentinel-ai

# Check which Python sentinel uses
which sentinel
sentinel --version
```

### Permission denied

```bash
# Don't use sudo with pip. Use --user instead:
pip install --user sentinel-ai

# Or better yet, use a virtual environment:
python -m venv .venv && source .venv/bin/activate
pip install sentinel-ai
```
