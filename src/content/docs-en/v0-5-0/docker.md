---
title: "Docker"
description: "Container usage, reference Dockerfile, and best practices."
order: 8
icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
---

# Docker

vigil can run inside Docker containers for reproducible environments, CI pipelines, or integration into existing Docker-based workflows.

## Recommended base image

```dockerfile
FROM python:3.12-slim

RUN pip install --no-cache-dir vigil-ai-cli

WORKDIR /app
ENTRYPOINT ["vigil"]
CMD ["--help"]
```

### Build

```bash
docker build -t vigil .
```

### Usage

```bash
# Scan a local directory
docker run --rm -v $(pwd):/app vigil scan src/

# With JSON format
docker run --rm -v $(pwd):/app vigil scan src/ -f json

# With a config file
docker run --rm -v $(pwd):/app vigil scan src/ -c .vigil.yaml

# Save report
docker run --rm -v $(pwd):/app vigil scan src/ -f sarif -o vigil.sarif
```

---

## Production Dockerfile

A more robust Dockerfile for production or distribution use:

```dockerfile
FROM python:3.12-slim AS base

# Metadata
LABEL maintainer="vigil team"
LABEL description="Security scanner for AI-generated code"
LABEL version="0.5.0"

# Create non-root user
RUN groupadd -r vigil && useradd -r -g vigil vigil

# Install vigil
RUN pip install --no-cache-dir vigil-ai-cli

# Working directory
WORKDIR /scan

# Cache directory
RUN mkdir -p /home/vigil/.cache/vigil/registry && \
    chown -R vigil:vigil /home/vigil

# Switch to non-root user
USER vigil

ENTRYPOINT ["vigil"]
CMD ["scan", "."]
```

### Advantages of this configuration

- **Non-root user**: Security best practice. vigil does not need privileges.
- **`--no-cache-dir`**: Reduces the image size.
- **`WORKDIR /scan`**: Clear mount point for the code to scan.
- **Cache directory**: Pre-created with correct permissions.

---

## Usage with Docker Compose

For integration into projects that use Docker Compose:

```yaml
# docker-compose.yaml
services:
  vigil:
    build:
      context: .
      dockerfile: Dockerfile.vigil
    volumes:
      - .:/scan:ro
      - vigil-cache:/home/vigil/.cache/vigil
    command: scan src/ --fail-on high -f json -o /scan/vigil-report.json

volumes:
  vigil-cache:
```

The `vigil-cache` volume persists the registry cache between runs, avoiding repeated HTTP requests.

---

## Offline mode in Docker

For runners without internet access or in restricted networks:

```bash
docker run --rm -v $(pwd):/scan --network none vigil scan src/ --offline
```

`--network none` disables the container's network, ensuring no external requests are made. Combined with `--offline`, vigil runs only static checks.

---

## Registry cache

### Persist cache between runs

```bash
# Create volume for cache
docker volume create vigil-cache

# Use the volume
docker run --rm \
  -v $(pwd):/scan \
  -v vigil-cache:/home/vigil/.cache/vigil \
  vigil scan src/
```

### Pre-warm cache

If you want to pre-load the cache before an offline scan:

```bash
# First run: with network, to populate cache
docker run --rm \
  -v $(pwd):/scan \
  -v vigil-cache:/home/vigil/.cache/vigil \
  vigil deps

# Subsequent runs: without network, using cache
docker run --rm \
  -v $(pwd):/scan \
  -v vigil-cache:/home/vigil/.cache/vigil \
  --network none \
  vigil scan src/
```

---

## CI with Docker

### GitHub Actions with Docker

```yaml
jobs:
  vigil:
    runs-on: ubuntu-latest
    container:
      image: python:3.12-slim
    steps:
      - uses: actions/checkout@v4
      - run: pip install vigil-ai-cli
      - run: vigil scan src/ --fail-on high
```

### GitLab CI with Docker

```yaml
vigil:
  image: python:3.12-slim
  stage: test
  script:
    - pip install vigil-ai-cli
    - vigil scan src/ -f junit -o report.xml
  artifacts:
    reports:
      junit: report.xml
```

### With a custom pre-built image

To avoid installing vigil on every run:

```yaml
# GitLab CI
vigil:
  image: registry.example.com/tools/vigil:latest
  stage: test
  script:
    - vigil scan src/ --fail-on high
```

---

## Multi-stage build

If vigil is part of a larger build pipeline:

```dockerfile
# Stage 1: Security scan
FROM python:3.12-slim AS security
RUN pip install --no-cache-dir vigil-ai-cli
WORKDIR /app
COPY . .
RUN vigil scan src/ --fail-on high

# Stage 2: Actual app build
FROM python:3.12-slim AS production
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "-m", "app"]
```

If vigil finds issues (exit code 1), the build fails at the first stage and the production image is not built. This acts as a quality gate in the build process.

---

## Image size

Estimated image sizes:

| Base | Approx. size |
|------|--------------|
| `python:3.12-slim` + vigil | ~180 MB |
| `python:3.12-alpine` + vigil | ~120 MB |
| `python:3.12` + vigil | ~1 GB |

Using `python:3.12-slim` is recommended as a balance between size and compatibility. Alpine may cause issues with some compiled dependencies.

---

## Best practices

1. **Mount code as read-only** (`-v $(pwd):/scan:ro`): vigil does not modify files. The read-only mount prevents accidental writes.

2. **Persist the registry cache**: Use a Docker volume or a host directory to avoid repeated HTTP requests between runs.

3. **Use a non-root user**: vigil does not need elevated privileges.

4. **Pin the vigil version**: In production Dockerfiles, use `pip install vigil-ai-cli==0.5.0` instead of `vigil-ai-cli` for reproducible builds.

5. **Separate scan from build**: In multi-stage builds, run vigil as an independent stage so it fails fast without wasting resources on later stages.

6. **Output to files within the volume**: When using `--output`, make sure the output file is in a mounted directory so the report can be accessed outside the container.
