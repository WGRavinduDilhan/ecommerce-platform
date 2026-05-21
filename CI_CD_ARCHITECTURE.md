# CI/CD Pipeline Architecture Summary

## System Overview

This ecommerce platform uses a comprehensive CI/CD pipeline built on GitHub Actions with GKE (Google Kubernetes Engine) for container orchestration and GCP services for infrastructure.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Push/PR                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌─────────────┐         ┌──────────────┐
    │  PR/DEV     │         │  MAIN        │
    │  Branch     │         │  Branch      │
    └──────┬──────┘         └──────┬───────┘
           │                       │
           ▼                       ▼
    ┌────────────────────────────────────────┐
    │        CI Pipeline (Parallel Jobs)     │
    ├────────────────────────────────────────┤
    │ • Configuration Validation             │
    │ • Service-specific Testing             │
    │ • Linting & Code Quality               │
    │ • Dependency Scanning                  │
    └──────────┬─────────────────────────────┘
               │
               ▼
    ┌────────────────────────────────────────┐
    │     Docker Build & Registry Push       │
    │  (ghcr.io - GitHub Container Registry) │
    └──────────┬─────────────────────────────┘
               │
               ▼
    ┌────────────────────────────────────────┐
    │     Security Scanning (Trivy, Semgrep) │
    │     Vulnerability Assessment          │
    └──────────┬─────────────────────────────┘
               │
        ┌──────┴──────────┐
        │                 │
        ▼                 ▼
    ┌────────────┐    ┌──────────────┐
    │  STAGING   │    │  PRODUCTION  │
    │  Auto Deploy│   │  Manual Approve
    │  (develop) │    │  (main)      │
    └────────────┘    └──────────────┘
        │                  │
        ▼                  ▼
    [GKE Staging]    [GKE Production]
    [Smoke Tests]    [Health Checks]
```

## Workflow Components

### 1. **Continuous Integration Layer**

**Files:** `.github/workflows/ci-main.yml`

**Triggered by:**
- Push to main/develop
- Pull requests
- Manual dispatch

**Jobs:**
- **Change Detection**: Identifies which services changed
- **Configuration Validation**: Docker Compose, Terraform syntax
- **Service-specific CI**:
  - Product Service (Python): pylint, black, mypy, pytest
  - Order Service (Node): ESLint, npm audit, Jest
  - Frontend (React): ESLint, npm audit, Vite build
  - Auth Service (Node): ESLint, npm audit, Jest
  - Other Services: Parallel Node.js testing

### 2. **Docker Build & Registry Layer**

**File:** `.github/workflows/docker-build.yml`

**Triggers:**
- Push to main/develop
- Service file changes
- Manual dispatch

**Actions:**
- Builds Docker images for all 7 services
- Pushes to GHCR with tags:
  - Branch: `develop`, `main`
  - SHA: `develop-abc1234`
  - Semver: `v1.0.0`
  - Latest: on main branch only

### 3. **Security Layer**

**File:** `.github/workflows/security-scan.yml`

**Runs on:**
- Push, PR, Daily schedule
- Multi-layer scanning:
  - **Dependency Scan**: npm audit, pip safety
  - **SAST**: Semgrep (security-audit, OWASP Top 10, CWE-25)
  - **Container Scan**: Trivy (CVE detection)
  - **Secrets Scan**: TruffleHog
  - **Code Analysis**: CodeQL (JavaScript, Python)

### 4. **Integration Testing Layer**

**File:** `.github/workflows/integration-tests.yml`

**Triggers:**
- Push, PR
- Daily 2 AM UTC
- Manual dispatch

**Tests:**
- Full docker-compose stack startup
- PostgreSQL connectivity (2 instances)
- Product API endpoints
- Order API endpoints
- Frontend build verification
- Artifact collection on failure

### 5. **Infrastructure Layer**

**File:** `.github/workflows/infrastructure.yml`

**Triggers:**
- Changes in infra/ directory
- Manual dispatch

**Actions:**
- Terraform format check & validation
- tflint linting
- Terraform plan (all branches)
- Terraform apply (main only)
- Cost estimation
- GKE cluster configuration

### 6. **Deployment Layer**

#### **Staging Deployment** (`.github/workflows/deploy-staging.yml`)
- **Trigger**: Push to develop branch
- **Environment**: GKE Staging (ecommerce-staging)
- **Strategy**: Rolling update
- **Approval**: Automatic
- **Services**: All 7 microservices

#### **Production Deployment** (`.github/workflows/deploy-production.yml`)
- **Trigger**: Push to main branch OR manual workflow dispatch
- **Environment**: GKE Production (ecommerce-prod)
- **Strategy**: Blue-green for product service, rolling for others
- **Approval**: Manual review required
- **Notifications**: Slack webhook
- **Health Checks**: Post-deployment validation

### 7. **Service-specific Workflows**

#### **Product Service** (`.github/workflows/product-service.yml`)
- Python FastAPI service
- Parallel test + build + scan
- Staging auto-deploy (develop)
- Production deploy with approval (main)

#### **Order Service** (`.github/workflows/order-service.yml`)
- Node.js Express service
- Similar structure to product service
- Independent CI/CD pipeline

## Environments & Clusters

### Staging (ecommerce-staging)
- **Cluster**: GKE cluster in us-central1-a
- **Namespace**: ecommerce-staging
- **Auto-deploy**: From develop branch
- **Replicas**: 3 per service
- **Autoscaling**: 3-10 pods based on CPU/memory

### Production (ecommerce-prod)
- **Cluster**: GKE cluster in us-central1-a
- **Namespace**: ecommerce
- **Manual approval**: Required
- **Replicas**: 3+ per service
- **Autoscaling**: 3-10 pods (product), 3-10 (order)
- **HA Setup**: Across availability zones

## Services Architecture

### Frontend (React/Vite)
- Port: 5173 (dev), 80 (prod via LoadBalancer)
- Replicas: 3
- Resources: 100m CPU, 128Mi memory (request), 200m/256Mi (limit)

### Product Service (Python/FastAPI)
- Port: 8000
- Database: PostgreSQL (product-db)
- Replicas: 3
- Resources: 250m CPU, 512Mi memory (request), 500m/1Gi (limit)
- Health Check: GET /health

### Order Service (Node/Express)
- Port: 3000
- Database: PostgreSQL (order-db)
- Replicas: 3
- Resources: 250m CPU, 256Mi memory (request), 500m/512Mi (limit)

### Auth Service (Node/Express)
- Port: 3001
- Replicas: 3
- Features: JWT, 2FA, OAuth

### Other Services
- Notification Service (Node)
- Payment Service (Node)
- Review Service (Node)

## Data Persistence

### Databases
- **Product DB**: PostgreSQL 15 (CloudSQL)
  - Automated backups
  - Read replicas
  - HA configuration

- **Order DB**: PostgreSQL 15 (CloudSQL)
  - Automated backups
  - Read replicas
  - HA configuration

### Caching (Optional)
- Redis for session management
- Redis for cache layer

## Security Implementation

### Container Security
- Non-root user execution (UID 1000)
- Read-only root filesystem (where possible)
- Resource limits and requests
- SecurityContext enforcement

### Network Security
- NetworkPolicies (ingress/egress rules)
- Service-to-service communication only
- LoadBalancer for frontend only
- Private GKE cluster (recommended)

### Secrets Management
- GitHub Secrets for credentials
- GCP Service Account IAM
- Pod security policies
- No secrets in logs or artifacts

### Scanning & Compliance
- SAST (Semgrep): OWASP, CWE, Security audit
- Dependency scanning: npm audit, pip safety
- Container scanning: Trivy CVE detection
- Secrets detection: TruffleHog

## Monitoring & Observability

### GKE Monitoring
- Cloud Logging enabled
- Cloud Monitoring (Prometheus)
- Pod logs available via kubectl
- Pod events tracking

### Application Health
- Liveness probes (restart if unhealthy)
- Readiness probes (traffic routing)
- Startup probes (initialization wait)
- HTTP health endpoints (/health)

### Deployment Tracking
- Rollout history per deployment
- Pod Disruption Budgets (minimum 2 pods running)
- Slack notifications on deployment
- GitHub Actions logs

## Performance Characteristics

### Build Time
- CI checks: ~5-10 minutes
- Docker builds: ~3-5 minutes per service (with cache)
- Integration tests: ~10-15 minutes
- Total CI: ~20 minutes

### Deploy Time
- Staging: ~5 minutes (auto)
- Production: ~10 minutes (with approval wait)
- Health checks: ~2 minutes
- Smoke tests: ~2 minutes

### Cost Optimization
- Docker layer caching (GitHub Actions)
- Dependency caching (npm, pip)
- Parallel job execution
- Preemptible VMs for staging
- Autoscaling on metrics

## Future Enhancements

### Short-term
- [ ] Add Helm charts for easier deployment
- [ ] Implement ArgoCD for GitOps
- [ ] Add performance benchmarking
- [ ] Enhanced monitoring dashboard

### Medium-term
- [ ] Service mesh implementation (Istio)
- [ ] Canary deployments
- [ ] Multi-region deployment
- [ ] Database migration automation

### Long-term
- [ ] Auto-scaling based on custom metrics
- [ ] Cost optimization analysis
- [ ] Multi-cloud deployment
- [ ] Advanced chaos engineering

## Repository Structure

```
.github/workflows/
├── ci-main.yml                    # Main CI pipeline
├── docker-build.yml               # Docker build & push
├── integration-tests.yml          # E2E tests
├── security-scan.yml              # Security scanning
├── infrastructure.yml             # Terraform CI/CD
├── deploy-staging.yml             # Staging deployment
├── deploy-production.yml          # Production deployment
├── product-service.yml            # Product service CI/CD
└── order-service.yml              # Order service CI/CD

k8s/
├── deployments.yaml               # All service deployments
└── networking-and-policies.yaml   # Network policies & quotas

services/
├── product-service/               # Python FastAPI
├── order-service/                 # Node Express
├── frontend/                       # React Vite
├── auth-service/                  # Node Express
├── notification-service/          # Node Express
├── payment-service/               # Node Express
└── review-service/                # Node Express

infra/
├── main.tf                         # Terraform main
├── variables.tf                    # Variables
├── vpc.tf                          # VPC configuration
├── gke.tf                          # GKE cluster
├── cloudsql.tf                     # Cloud SQL instances
└── terraform.tfvars                # Terraform values
```

## Setup Instructions

1. **Create GitHub Secrets**
   ```bash
   bash scripts/setup-cicd.sh
   ```

2. **Configure GCP**
   - Create service account
   - Export credentials JSON
   - Set `GCP_SA_KEY` secret

3. **Set up Environments**
   - Create 'staging' and 'production' environments
   - Add protection rules for production

4. **Create GKE Clusters**
   - Run Terraform in `infra/`
   - Creates staging and production clusters

5. **Deploy Initial Resources**
   ```bash
   kubectl apply -f k8s/deployments.yaml
   kubectl apply -f k8s/networking-and-policies.yaml
   ```

6. **Push to Repository**
   - Workflows trigger automatically
   - Monitor in GitHub Actions

## Conclusion

This CI/CD pipeline provides:
- ✅ Automated testing and validation
- ✅ Secure container building and scanning
- ✅ Multi-stage deployment strategy
- ✅ Infrastructure as Code management
- ✅ Security compliance checking
- ✅ Performance optimization
- ✅ Production-grade reliability
