# ecommerce-platform

Modern ecommerce platform with multiple services and infra-as-code to run locally or in cloud.

Summary
- `product-service`: FastAPI (Python) providing product CRUD and DB migrations.
- `order-service`: Express (Node.js) handling orders and PostgreSQL access.
- `frontend`: Vite + React dashboard UI.
- `product-service`, `order-service`, `frontend` each have their own Dockerfile and CI workflow.
- `infra`: Terraform configuration for cloud resources (GKE, Cloud SQL, VPC, etc.).

Repository structure
- services/product-service/ — FastAPI app, requirements.txt, Dockerfile, tests
- services/order-service/ — Express app, package.json, Dockerfile (uses npm install when no lockfile)
- services/frontend/ — Vite React app, package.json, package-lock.json, Dockerfile
- infra/ — Terraform projects and modules
- .github/workflows/ — CI, build and security scan workflows

Run locally (quick)
1. Start product service dependencies and build images with Docker Compose from repository root:

```powershell
docker compose up --build
```

2. Or run individual services:

Python service:
```powershell
cd services/product-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Node service (order):
```powershell
cd services/order-service
npm install
npm run start
```

Frontend:
```powershell
cd services/frontend
npm ci
npm run dev -- --host 0.0.0.0
```

Service URLs (defaults)
- Frontend: http://localhost:5173
- Product API: http://localhost:8000
- Order API: http://localhost:3000

CI and Docker builds
- Workflows in `.github/workflows/` build and scan images with `docker/build-push-action@v5` and Trivy.
- The monorepo Docker builder will generate per-service Dockerfiles when missing and uses `npm install --omit=dev` as a fallback when `package-lock.json` is not present. The frontend keeps `npm ci` and relies on committed `package-lock.json`.

Terraform / Infrastructure
- Terraform is in `infra/`. Workflows run `terraform plan` and `terraform apply` (apply runs only on `main`).
- Required repository secrets for infra deployments:
	- `GCP_SA_KEY` — service account JSON (base64 or raw) for Google Cloud auth
	- `GCP_PROJECT_ID` — GCP project id used by Terraform
	- `SLACK_WEBHOOK_URL` — optional, for deployment notifications

Security and scanning
- The CI includes dependency scans, Semgrep SAST, CodeQL and Trivy container scans. SARIF upload uses the current `upload-sarif@v4` action.

Developer notes
- Some backend Node services do not commit `package-lock.json`. For reproducible builds, consider committing lockfiles and re-enabling `npm ci`.
- Workflows now support a `CI_REPO_PAT` secret fallback for `actions/checkout` to allow runs in contexts where the default GitHub token is restricted.

Contributing
- Run tests in each service before opening PRs and follow linting rules in workflows.

Contact
- Maintainer: check repository owner/contact in GitHub.

---
Updated to reflect service layout, CI, and infra secrets (May 2026).