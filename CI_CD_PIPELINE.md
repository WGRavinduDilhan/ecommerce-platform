# CI/CD Pipeline Documentation

## Overview

This document describes the complete CI/CD pipeline for the ecommerce platform microservices architecture.

## Pipeline Stages

### 1. **Continuous Integration (CI)**

The CI pipeline runs on every push and pull request.

#### Workflows:
- **ci-main.yml**: Main CI pipeline
  - Detects changed services (change detection)
  - Lints configuration files (docker-compose, Terraform)
  - Runs service-specific tests and linting

#### Coverage:
- **Product Service** (Python/FastAPI)
  - Linting with pylint
  - Format check with black
  - Type checking with mypy
  - Unit tests with pytest

- **Node.js Services** (Express)
  - ESLint for code quality
  - Jest for unit tests
  - Vulnerability scanning with npm audit

- **Frontend** (React/Vite)
  - ESLint for code quality
  - Build verification
  - npm audit for vulnerabilities

### 2. **Docker Build & Registry**

Automatically builds and pushes Docker images on commits to main/develop.

#### Workflows:
- **docker-build.yml**: Builds and scans container images
  - Builds images for all services
  - Pushes to GitHub Container Registry (ghcr.io)
  - Scans with Trivy for vulnerabilities
  - Tags images with: branch, semver, SHA, latest (for main)

### 3. **Integration Tests**

Comprehensive end-to-end testing with all services running.

#### Workflows:
- **integration-tests.yml**: Full system testing
  - Starts all services with docker-compose
  - Runs database migrations
  - Tests API endpoints
  - Validates frontend build
  - Collects logs on failure

### 4. **Security Scanning**

Multi-layer security analysis.

#### Workflows:
- **security-scan.yml**: Comprehensive security analysis
  - Dependency vulnerability scanning (npm audit, Safety)
  - SAST with Semgrep
  - Container scanning with Trivy
  - Secrets detection with TruffleHog
  - CodeQL analysis (JavaScript, Python)

### 5. **Infrastructure as Code**

Terraform-based infrastructure management.

#### Workflows:
- **infrastructure.yml**: IaC pipeline
  - Terraform plan and validate
  - tflint for linting
  - Cost estimation
  - Apply infrastructure changes (main branch only)

### 6. **Deployment**

Progressive deployment strategy with staging and production environments.

#### Workflows:

**deploy-staging.yml**: Deploys to staging from develop branch
- Updates images in staging GKE cluster
- Automatic deployment (no approval required)
- Smoke tests after deployment

**deploy-production.yml**: Deploys to production from main branch
- Blue-green deployment for product service
- Manual environment protection
- Requires GitHub environment approval
- Smoke tests and health checks
- Slack notifications

## Pipeline Triggers

| Workflow | Trigger | Environment |
|----------|---------|------------|
| ci-main.yml | Push to main/develop or PR | N/A |
| docker-build.yml | Push to main/develop (service changes) | N/A |
| integration-tests.yml | Push, PR, Daily schedule | N/A |
| security-scan.yml | Push, PR, Daily schedule | N/A |
| infrastructure.yml | Push to main/develop (infra changes) | GCP |
| deploy-staging.yml | Push to develop | GCP Staging |
| deploy-production.yml | Push to main or workflow_dispatch | GCP Production |

## Environment Setup

### Required Secrets in GitHub

```
GCP_PROJECT_ID          - GCP project ID
GCP_SA_KEY             - GCP service account key (JSON)
SLACK_WEBHOOK          - Slack webhook for notifications
GITHUB_TOKEN           - Auto-provided by GitHub
```

### Repository Settings

1. **Enable Branch Protection** (main branch)
   - Require status checks to pass
   - Require code reviews: 1 approval
   - Require environment approvals for production

2. **Set Environment Secrets**
   - `production`: GCP credentials
   - `staging`: GCP credentials

3. **Set Deployment Protection Rules**
   - Production: Require at least 1 reviewer

## Service Deployment Flow

```
main branch
    ↓
CI Tests Pass
    ↓
Build Docker Images
    ↓
Security Scan
    ↓
Deploy to Production (with approval)
    ↓
Health Checks & Smoke Tests

---

develop branch
    ↓
CI Tests Pass
    ↓
Build Docker Images
    ↓
Security Scan
    ↓
Auto-Deploy to Staging
    ↓
Health Checks & Smoke Tests
```

## Service Dependencies

```
Frontend
    ├── Product Service API (8000)
    ├── Order Service API (3000)
    ├── Auth Service API (3001)
    └── Notification Service (3002)

Product Service
    └── PostgreSQL (5432)

Order Service
    └── PostgreSQL (5433)

Auth Service
    ├── PostgreSQL
    └── Redis (optional)
```

## Deployment Architecture

### GKE Clusters

**Staging** (`ecommerce-staging`)
- Zone: us-central1-a
- Namespace: ecommerce-staging
- Auto-scaling enabled
- Development-grade resources

**Production** (`ecommerce-prod`)
- Zone: us-central1-a
- Namespace: ecommerce
- High availability (HA) setup
- Production-grade resources
- Blue-green deployment

### Database Management

- **Product DB**: PostgreSQL (Cloud SQL)
  - Automated backups
  - Read replicas
  - HA configuration

- **Order DB**: PostgreSQL (Cloud SQL)
  - Automated backups
  - Read replicas
  - HA configuration

## Monitoring & Notifications

### Slack Integration

Deployment events are posted to Slack:
- ✅ Successful deployments
- ❌ Failed deployments
- 📊 Status updates

Configure webhook URL in: `Settings → Secrets → SLACK_WEBHOOK`

### Health Checks

All deployments include:
- Pod readiness probes
- Liveness probes
- Startup probes
- Service endpoint validation

## Manual Triggers

### Deploy to Production Manually

```bash
# Via GitHub UI
Actions → Deploy to Production → Run workflow
  ├── Select branch: main
  └── Choose environment: production

# Or use GitHub CLI
gh workflow run deploy-production.yml --ref main
```

### Terraform Plan Review

```bash
# Check plan in PR comments before merge
# Plan artifacts stored for 5 days in Actions
```

## CI/CD Best Practices

1. **Always test locally first**
   ```bash
   docker-compose up --build
   npm test
   pytest
   ```

2. **Use semantic versioning** for releases
   - Tags trigger production releases automatically

3. **Review security scan results**
   - Check GitHub Security tab for vulnerabilities
   - Address critical/high severity issues before merge

4. **Monitor deployment status**
   - Check GitHub Actions for workflow results
   - Review pod logs in GKE if issues occur

5. **Keep secrets secure**
   - Never commit credentials
   - Use GitHub secrets for environment variables
   - Rotate service account keys periodically

## Troubleshooting

### Workflow Failures

**View logs:**
- GitHub Actions → Workflow run → Job → Step logs

**Common issues:**
- Docker build timeouts: Increase timeout in workflow
- Test failures: Check service-specific test output
- Deployment failures: Review kubectl rollout status

### Database Connection Issues

**Check:**
```bash
# Verify Cloud SQL connectivity
gcloud sql connect instance-name

# Check password and network policies
```

### Pod Crashes in GKE

**Debug:**
```bash
kubectl logs pod-name -n namespace
kubectl describe pod pod-name -n namespace
```

## Performance Optimization

### Build Caching

- Docker layer caching enabled (type=gha)
- npm/pip dependency caching
- Terraform state cached locally

### Parallel Execution

- Services build in parallel
- Tests run concurrently
- Multiple deployment strategies reduce duration

## Security Best Practices

1. **Container Scanning**
   - Trivy scans all images for CVEs
   - Results available in GitHub Security tab

2. **Secret Management**
   - All secrets in GitHub Secrets
   - Service account keys rotated regularly
   - No secrets in logs or artifacts

3. **Access Control**
   - Production deployments require approval
   - RBAC configured in GKE
   - IAM roles follow principle of least privilege

4. **Compliance**
   - Audit logs enabled in GKE
   - Infrastructure changes tracked in Terraform
   - Deployment records maintained

## Cost Optimization

- **Resource limits** configured in Kubernetes
- **Auto-scaling** based on CPU/memory
- **Scheduled pods** for non-critical services
- **Cost estimation** in Terraform workflow

## Related Documentation

- [Architecture](../ARCHITECTURE.md)
- [Database Schema](../DATABASE_SCHEMA.md)
- [Implementation Guide](../IMPLEMENTATION_GUIDE.md)
- [Terraform README](../infra/README.md)
