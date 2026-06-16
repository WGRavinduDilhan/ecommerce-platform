# ecommerce-platform

Modern ecommerce platform with microservices architecture and full infrastructure-as-code to run locally or in cloud (GKE + Cloud SQL + GCP).

## Services

| Service | Language | Port | Description |
|---|---|---|---|
| `product-service` | Python (FastAPI) | 8000 | Product CRUD and DB migrations |
| `order-service` | Node.js (Express) | 3000 | Order management and PostgreSQL access |
| `frontend` | React (Vite) | 5173 | Dashboard UI |

## Repository Structure

```
ecommerce-platform/
├── services/
│   ├── product-service/     # FastAPI app, requirements.txt, Dockerfile, tests
│   ├── order-service/       # Express app, package.json, Dockerfile
│   └── frontend/            # Vite React app, package-lock.json, Dockerfile
├── infra/
│   ├── bootstrap/           # One-time WIF setup (manual apply only)
│   ├── main.tf              # Provider and backend config
│   ├── variables.tf         # Input variable declarations
│   ├── vpc.tf               # VPC network and subnet
│   ├── gke.tf               # GKE cluster and node pool
│   ├── cloudsql.tf          # Cloud SQL PostgreSQL instance
│   └── iam.tf               # Service account IAM role bindings
├── k8s/                     # Kubernetes manifests (Deployments, Services, HPA, PDB)
├── .github/workflows/       # CI, build, security scan, and infra workflows
└── docs/                    # Architecture, CI/CD, and troubleshooting guides
```

---

## Run Locally

### Quick start (all services)
```powershell
docker compose up --build
```

### Individual services

**Python — product-service:**
```powershell
cd services/product-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Node.js — order-service:**
```powershell
cd services/order-service
npm install
npm run start
```

**Frontend:**
```powershell
cd services/frontend
npm ci
npm run dev -- --host 0.0.0.0
```

### Default URLs
| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Product API | http://localhost:8000 |
| Order API | http://localhost:3000 |

---

## Infrastructure (Terraform + GKE)

Terraform is in `infra/`. The CI/CD pipeline runs `terraform plan` on every push to `infra/**` and `terraform apply` automatically on push to `main`.

### First-Time Setup (Bootstrap)

The Workload Identity Federation pool must be created **once manually** before the CI pipeline can authenticate. This is a one-time prerequisite:

```bash
# Step 1 — Bootstrap WIF (run once, from your local machine)
cd infra/bootstrap
terraform init
terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="github_repo=OWNER/REPO" \
  -var="service_account_email=YOUR_SA@PROJECT.iam.gserviceaccount.com"

# Step 2 — Grant the SA permission to manage IAM bindings (run once)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/resourcemanager.projectIamAdmin"
```

### Required GitHub Actions Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID (e.g. `ecommerce-devops-498814`) |
| `WIF_PROVIDER` | Full WIF provider name (output from bootstrap step above) |
| `WIF_SERVICE_ACCOUNT` | Service account email used by GitHub Actions |
| `DB_PASSWORD` | Cloud SQL app user password |
| `SLACK_WEBHOOK_URL` | Optional — Slack webhook for deployment notifications |

### Terraform Variables

All required variables are passed via `-var` in the workflow. Do **not** rely on `terraform.tfvars` for CI — it is excluded by `.gitignore` and will never reach the runner.

---

## CI/CD Workflows

| Workflow | Trigger | What it Does |
|---|---|---|
| `infrastructure.yml` | Push to `infra/**` or `main` | Terraform plan + apply |
| `docker-build.yml` | Push to any branch | Build and push Docker images |
| `ci-main.yml` | Push / PR | Lint, test, security scan |
| `security-scan.yml` | Push / PR | Trivy, Semgrep, CodeQL |

---

## Security

- All containers run as non-root (`runAsUser: 1000`)
- Linux capabilities dropped (`capabilities.drop: [ALL]`)
- Cloud SQL uses SSL-only connections (`ssl_mode: ENCRYPTED_ONLY`)
- Workload Identity Federation — no long-lived service account keys in CI
- Pod Disruption Budgets (`minAvailable: 2`) on all three services
- Pod anti-affinity rules prevent all replicas landing on one node

---

## Troubleshooting

For a full log of all known issues, root causes, and confirmed fixes — including:
- `Artifact not found for name: terraform-plan`
- `terraform plan` silently exiting with code 1
- `terraform plan` hanging indefinitely
- 403 Permission Denied on WIF pool creation
- 403 Permission Denied on VPC creation
- `require_ssl` unsupported argument
- Kubernetes selector label mismatches
- Missing SecurityContext, PDB, ServiceAccount

→ See **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**

---

## Developer Notes

- Node services that do not commit `package-lock.json` will use `npm install` as a build fallback. For reproducible builds, commit lockfiles and switch to `npm ci`.
- Workflows support a `CI_REPO_PAT` secret fallback for `actions/checkout` in restricted token contexts.
- Run tests in each service before opening PRs and follow linting rules in workflows.

---

## Contact

Maintainer: check repository owner/contact in GitHub.

---

*Last updated: June 2026*