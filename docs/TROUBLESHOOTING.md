# Troubleshooting & Fix Log

This document records all known issues encountered in this project and their confirmed fixes.

---

## Table of Contents

1. [Terraform Artifact Not Found](#1-terraform-artifact-not-found)
2. [Terraform Plan Silently Exits with Code 1](#2-terraform-plan-silently-exits-with-code-1)
3. [Terraform Plan Hangs Indefinitely](#3-terraform-plan-hangs-indefinitely)
4. [Terraform Apply — 403 Permission Denied (WIF Pool)](#4-terraform-apply--403-permission-denied-wif-pool)
5. [Terraform Apply — 403 Permission Denied (Compute Networks)](#5-terraform-apply--403-permission-denied-compute-networks)
6. [Cloud SQL — Unsupported Argument require_ssl](#6-cloud-sql--unsupported-argument-require_ssl)
7. [Kubernetes — Selector Label Mismatch](#7-kubernetes--selector-label-mismatch)
8. [Kubernetes — Frontend Service LoadBalancer Exposure](#8-kubernetes--frontend-service-loadbalancer-exposure)
9. [Kubernetes — Missing Security Hardening](#9-kubernetes--missing-security-hardening)
10. [Kubernetes — Missing Resources (ServiceAccount, PDB, HPA)](#10-kubernetes--missing-resources-serviceaccount-pdb-hpa)
11. [Terraform Init — Duplicate Variable Declaration](#11-terraform-init--duplicate-variable-declaration)
12. [tflint — Unused Local and Variable After Bootstrap Move](#12-tflint--unused-local-and-variable-after-bootstrap-move)

---

## 1. Terraform Artifact Not Found

**File affected:** `.github/workflows/infrastructure.yml`

### Error
```
Error: Unable to download artifact(s): Artifact not found for name: terraform-plan
Please ensure that your artifact is not expired and the artifact was uploaded
using a compatible version of toolkit/upload-artifact.
```

### Root Cause
The `Upload plan` step in the `terraform-plan` job had **no `if:` guard**. It ran unconditionally even when GCP credentials were absent and the `Plan Terraform` step was skipped. When the plan step is skipped, `infra/tfplan` is never created, so the upload action uploads nothing (or fails silently). The `terraform-apply` job then finds no artifact to download.

```yaml
# BEFORE — runs even when tfplan was never created
- name: Upload plan
  uses: actions/upload-artifact@v4
  with:
    name: terraform-plan
    path: infra/tfplan     # ← file doesn't exist if plan was skipped
```

### Fix
Added `if: steps.creds.outputs.has_creds == 'true' && steps.plan.outcome == 'success'` guard so the upload only happens when the plan actually ran and succeeded.

```yaml
# AFTER
- name: Upload plan
  if: steps.creds.outputs.has_creds == 'true' && steps.plan.outcome == 'success'
  uses: actions/upload-artifact@v4
  with:
    name: terraform-plan
    path: |
      infra/tfplan
      infra/plan.json
      infra/plan.log
    retention-days: 1
```

> **Also fixed:** `retention-days` changed from 5 → 1 (artifact only needed between jobs in the same run), and `setup-terraform` upgraded from v2 → v3 across all three jobs.

---

## 2. Terraform Plan Silently Exits with Code 1

**File affected:** `infra/gke.tf`, `infra/cloudsql.tf`, `infra/vpc.tf`, `.github/workflows/infrastructure.yml`

### Error
```
Error: Terraform exited with code 1.
Error: Process completed with exit code 1.
```
No further explanation visible in logs.

### Root Cause 1 — Empty Terraform Files
`gke.tf`, `cloudsql.tf`, and `vpc.tf` were **0-byte empty stub files**. Terraform had no resources to plan, causing a silent exit 1.

### Root Cause 2 — `> plan.json` Swallows stderr
The original plan command was:
```bash
terraform plan -out=tfplan -json > plan.json
```
The `>` redirect captures **stdout only**. Terraform writes all error diagnostics to **stderr**. Every error message was silently discarded into nowhere — invisible in GitHub Actions logs.

### Root Cause 3 — `terraform output -raw gke_cluster_name` Failed
The `Get outputs` step in the apply job called `terraform output -raw gke_cluster_name` but no `output "gke_cluster_name"` block existed anywhere in the Terraform files, causing another silent exit 1.

### Fix

**Created `infra/vpc.tf`:**
```hcl
resource "google_compute_network" "vpc" {
  name                    = "ecommerce-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "subnet" {
  name          = "ecommerce-subnet"
  ip_cidr_range = "10.0.0.0/18"
  region        = var.region
  network       = google_compute_network.vpc.id
  project       = var.project_id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.48.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.52.0.0/20"
  }
}
```

**Created `infra/gke.tf`** with GKE cluster + node pool + required outputs:
```hcl
output "gke_cluster_name" {
  value = google_container_cluster.primary.name
}

output "region" {
  value = var.region
}
```

**Created `infra/cloudsql.tf`** with PostgreSQL 15 instance, two databases, and app user.

**Fixed the plan command in the workflow** to show errors in logs:
```bash
# BEFORE — stderr swallowed, errors invisible
terraform plan -out=tfplan -json > plan.json

# AFTER — both streams visible in log, JSON generated separately
set -o pipefail
terraform plan \
  -var="project_id=${{ secrets.GCP_PROJECT_ID }}" \
  -var="db_password=${{ secrets.DB_PASSWORD }}" \
  -var="service_account_email=${{ secrets.WIF_SERVICE_ACCOUNT }}" \
  -out=tfplan 2>&1 | tee plan.log
terraform show -json tfplan > plan.json
```

---

## 3. Terraform Plan Hangs Indefinitely

**File affected:** `.github/workflows/infrastructure.yml`

### Symptom
The GitHub Actions job runs for hours with no output, eventually timing out. The last visible line is:
```
var.github_repo
  GitHub Repository (owner/repo)
```

### Root Cause
Terraform was waiting for **interactive keyboard input** for the `github_repo` variable. The `terraform.tfvars` file (which contains `github_repo = "..."`) is excluded by `.gitignore` line 35 (`*.tfvars`) and therefore never reaches the GitHub Actions runner. Terraform has no value for the variable, no default, and no `-var` flag supplying it — so it falls back to interactive prompt mode. GitHub Actions has no stdin, so the job hangs forever.

### Fix
Added `-var="github_repo=${{ github.repository }}"` to the plan command. The `github.repository` context variable is a built-in GitHub Actions value that automatically resolves to `owner/repo` format — no hardcoding, no extra secrets required.

```yaml
terraform plan \
  -var="github_repo=${{ github.repository }}" \   # ← added
  ...
```

> **Rule:** Never rely on `.tfvars` files for required variables in CI. All required variables must be passed explicitly via `-var`, `-var-file`, or `TF_VAR_*` environment variables. `.tfvars` files belong in `.gitignore` and will never be available on the runner.

---

## 4. Terraform Apply — 403 Permission Denied (WIF Pool)

**File affected:** `infra/iam.tf`

### Error
```
Error: Error creating WorkloadIdentityPool: googleapi: Error 403:
Permission 'iam.workloadIdentityPools.create' denied on resource
'//iam.googleapis.com/projects/***/locations/global'
  with google_iam_workload_identity_pool.pool,
  on iam.tf line 1
```

### Root Cause — Chicken-and-Egg Bootstrap Problem
The Workload Identity Pool (`github-pool`) **already exists** — it had to exist for the workflow to authenticate in the first place. `iam.tf` was trying to **recreate** it from scratch, which fails because:

1. The resource already exists (would be a conflict, 409) **or**
2. The service account does not have `iam.workloadIdentityPoolAdmin` permission — and granting it would be dangerous because the SA would be managing its own authentication pool

This is a fundamental bootstrap paradox: Terraform cannot manage the resource that enables Terraform to authenticate.

### Fix
Moved the WIF pool and provider resources to a **separate one-time bootstrap directory** (`infra/bootstrap/main.tf`) that is applied manually once, before the CI pipeline is set up, and never touched by the automated pipeline again.

```
infra/
├── bootstrap/
│   └── main.tf          ← WIF pool + provider (manual apply, one time only)
├── iam.tf               ← Service account IAM role bindings (CI managed)
├── gke.tf
├── vpc.tf
└── cloudsql.tf
```

**How to apply bootstrap (once only):**
```bash
cd infra/bootstrap
terraform init
terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="github_repo=OWNER/REPO" \
  -var="service_account_email=YOUR_SA@PROJECT.iam.gserviceaccount.com"
```

---

## 5. Terraform Apply — 403 Permission Denied (Compute Networks)

**File affected:** `infra/iam.tf`, GCP IAM

### Error
```
Error: Error creating Network: googleapi: Error 403:
Required 'compute.networks.create' permission for
'projects/***/global/networks/ecommerce-vpc', forbidden
  with google_compute_network.vpc,
  on vpc.tf line 1
```

### Root Cause
The GitHub Actions service account was created with minimal permissions and was never granted the IAM roles required to create and manage GCP infrastructure resources.

### Fix
Rewrote `infra/iam.tf` to grant all required roles to the service account via `google_project_iam_member` resources:

| Role | Purpose |
|---|---|
| `roles/compute.networkAdmin` | Create VPC networks and subnets |
| `roles/container.admin` | Create GKE cluster and node pools |
| `roles/cloudsql.admin` | Create Cloud SQL instances, databases, users |
| `roles/storage.admin` | Read/write GCS backend for Terraform state |
| `roles/iam.serviceAccountUser` | Impersonate node pool service account |

**Pre-requisite (run once in GCP Console or terminal):**
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/resourcemanager.projectIamAdmin"
```
This allows the service account to manage its own IAM bindings on the first Terraform run.

---

## 6. Cloud SQL — Unsupported Argument `require_ssl`

**File affected:** `infra/cloudsql.tf`

### Error
```
Error: Unsupported argument
  on cloudsql.tf line 35, in resource "google_sql_database_instance" "postgres":
  35:     require_ssl = true
An argument named "require_ssl" is not expected here.
```

### Root Cause
`require_ssl` was deprecated and **removed** from `google_sql_database_instance.settings.ip_configuration` in the Google Terraform provider **v5.0**. The lock file uses **v7.33.0** where the field no longer exists.

### Fix
```hcl
# BEFORE — removed in provider v5+
ip_configuration {
  require_ssl = true
}

# AFTER — correct field in provider v5+/v7.x
ip_configuration {
  ssl_mode = "ENCRYPTED_ONLY"
}
```

**`ssl_mode` valid values:**

| Value | Behaviour |
|---|---|
| `ALLOW_UNENCRYPTED_AND_ENCRYPTED` | SSL optional |
| `ENCRYPTED_ONLY` | SSL required, no client certs ← **use this** |
| `TRUSTED_CLIENT_CERTIFICATE_REQUIRED` | SSL + client certificate |

---

## 7. Kubernetes — Selector Label Mismatch

**File affected:** `k8s/deployments.yaml`

### Error
IDE linter warning on all three Deployments (`product-service`, `order-service`, `frontend`).

### Root Cause
All three Deployments declared `version: v1` in pod template labels but the `selector.matchLabels` only matched on `app`, ignoring `version`. This creates ambiguity during multi-version rollouts — the selector would claim pods from any version.

```yaml
# BEFORE — mismatch
selector:
  matchLabels:
    app: product-service      # only one label

template:
  metadata:
    labels:
      app: product-service
      version: v1             # version present but not in selector
```

### Fix
Added `version: v1` to `selector.matchLabels` for all three Deployments:

```yaml
# AFTER
selector:
  matchLabels:
    app: product-service
    version: v1               # matches exactly
```

> **Important:** The `selector` field is **immutable** after a Deployment is first applied. If Deployments already exist in the cluster, delete and re-apply: `kubectl delete deployment <name> -n ecommerce && kubectl apply -f k8s/deployments.yaml`

---

## 8. Kubernetes — Frontend Service LoadBalancer Exposure

**File affected:** `k8s/deployments.yaml`

### Error
`frontend` Service had `type: LoadBalancer`.

### Root Cause
`type: LoadBalancer` in GKE provisions an **external cloud load balancer with a public IP** directly on the Service, bypassing the Ingress controller, TLS termination, and all routing/security rules defined in `networking-and-policies.yaml`.

### Fix
```yaml
# BEFORE
spec:
  type: LoadBalancer   # ← direct public LB, bypasses Ingress

# AFTER
spec:
  type: ClusterIP      # ← internal only; Ingress handles external traffic
```

---

## 9. Kubernetes — Missing Security Hardening

**File affected:** `k8s/deployments.yaml`

### Root Cause
`order-service` and `frontend` containers were missing security controls that `product-service` already had.

### Fixes Applied

| Container | Missing Field | Risk | Fix |
|---|---|---|---|
| `order-service` | `capabilities.drop: [ALL]` | Retains default Linux capabilities (NET_BIND_SERVICE, CHOWN, etc.) | Added |
| `order-service` | `readOnlyRootFilesystem` | Intent not explicit | Added `false` |
| `frontend` | Entire `securityContext` | Runs as root, no capability drop | Added full securityContext |
| `order-service` | `timeoutSeconds` on liveness | Defaulted to 1s — causes false restarts on slow DB queries | Set to `5s` |
| `order-service` | `timeoutSeconds` on readiness | Defaulted to 1s | Set to `3s` |
| `frontend` | `timeoutSeconds` on all probes | Defaulted to 1s | Set to `5s` / `3s` |

**Full securityContext applied to all containers:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: false
  capabilities:
    drop:
    - ALL
```

---

## 10. Kubernetes — Missing Resources (ServiceAccount, PDB, HPA)

**File affected:** `k8s/deployments.yaml`

### Missing Resources Added

| Resource | For | Why It Was Needed |
|---|---|---|
| `ServiceAccount: frontend` | `frontend` | Deployment referenced `serviceAccountName: frontend` but no SA was declared — would fail at pod creation |
| `PodDisruptionBudget: frontend-pdb` | `frontend` | `product-service` and `order-service` had PDBs; frontend had none — all 3 pods could be evicted simultaneously during node drain |
| Memory metric in HPA | `order-service` | HPA only had CPU metric; Node.js services can OOM without CPU spiking |
| `startupProbe` | `order-service`, `frontend` | Without startup probe, liveness kicks in at `initialDelaySeconds: 30` — if DB migration takes longer, pod restart loop occurs |
| `/tmp` emptyDir volume | `order-service`, `frontend` | Node.js writes temp files to `/tmp`; without this, writes go to container layer |
| `podAntiAffinity` | `order-service`, `frontend` | Without anti-affinity, all 3 replicas can land on the same node — single node failure kills all replicas |

---

## 11. Terraform Init — Duplicate Variable Declaration

**File affected:** `infra/iam.tf`, `infra/variables.tf`

### Error
```
Error: Terraform encountered problems during initialisation, including problems
with the configuration, described below.

Error: Duplicate variable declaration

  on variables.tf line 22:
  22: variable "service_account_email" {

A variable named "service_account_email" was already declared at
iam.tf:1,1-33. Variable names must be unique within a module.
```

### Root Cause
When `iam.tf` was rewritten to contain IAM role bindings, the `variable "service_account_email"` block was added at the top of `iam.tf`. At the same time, the same variable was added to `variables.tf`. Terraform treats all `.tf` files in a directory as a **single module** — variable names must be unique across the entire module regardless of which file declares them.

```hcl
# BEFORE — declared in TWO files (causes init failure)

# iam.tf line 1
variable "service_account_email" {    # ← duplicate
  type        = string
  description = "Email of the GitHub Actions service account"
}

# variables.tf line 22
variable "service_account_email" {    # ← duplicate
  type        = string
  description = "Email of the GitHub Actions service account"
}
```

### Fix
Removed the `variable` block from `iam.tf`. The canonical location for all variable declarations is `variables.tf`. Resources in `iam.tf` continue to reference `var.service_account_email` normally.

```hcl
# AFTER — declared ONCE in variables.tf only
variable "service_account_email" {
  type        = string
  description = "Email of the GitHub Actions service account"
}
```

> **Rule:** Always declare variables in `variables.tf`. Never declare them inside resource files (`iam.tf`, `gke.tf`, etc.) — even if it feels convenient to co-locate them with the resource that uses them.

---

## 12. tflint — Unused Local and Variable After Bootstrap Move

**File affected:** `infra/main.tf`, `infra/variables.tf`, `.github/workflows/infrastructure.yml`

### Error
```
1 issue(s) found:

Warning: [Fixable] local.github_repo is declared but not used
(terraform_unused_declarations)

  on main.tf line 26:
  26:   github_repo = var.github_repo

Error: Process completed with exit code 2.
```

### Root Cause
When the WIF pool and provider were moved from `infra/iam.tf` to `infra/bootstrap/main.tf`, the consumer of `local.github_repo` (the `attribute_condition` in the WIF provider resource) moved with it. The `locals` block in `infra/main.tf` remained behind, now referencing a variable that is itself no longer used by anything in the main module.

tflint exits with **code 2** (treated as an error by GitHub Actions) when it finds unused declarations.

```hcl
# main.tf — orphaned local after bootstrap move
locals {
  github_repo = var.github_repo   # ← nothing reads local.github_repo anymore
}

# variables.tf — orphaned variable, no resource references it
variable "github_repo" {
  type        = string
  description = "GitHub Repository (owner/repo)"
}
```

### Fix
Removed all three references to `github_repo` from the main module in the same commit:

**`infra/main.tf`** — removed `locals` block:
```hcl
# REMOVED
locals {
  github_repo = var.github_repo
}
```

**`infra/variables.tf`** — removed `github_repo` variable:
```hcl
# REMOVED
variable "github_repo" {
  type        = string
  description = "GitHub Repository (owner/repo)"
}
```

**`.github/workflows/infrastructure.yml`** — removed the `-var` flag from the plan command:
```bash
# REMOVED from terraform plan
-var="github_repo=${{ github.repository }}"
```

`github_repo` still exists in `infra/bootstrap/main.tf` where it is actually used — that is the correct and only place it belongs.

> **Rule:** When moving resources between Terraform modules, always audit for orphaned `locals`, `variables`, `outputs`, and CI `-var` flags in the same PR. Leaving any one of them behind causes lint or init failures in subsequent runs.

---

## Required GitHub Actions Secrets

| Secret Name | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID (e.g. `ecommerce-devops-498814`) |
| `WIF_PROVIDER` | Full WIF provider resource name (output from bootstrap) |
| `WIF_SERVICE_ACCOUNT` | Service account email used by GitHub Actions |
| `DB_PASSWORD` | Cloud SQL app user password |
| `SLACK_WEBHOOK_URL` | Optional — for deployment notifications |

---

## Infra Deployment Order (First Time Setup)

```
Step 1 — Bootstrap (manual, run once)
  cd infra/bootstrap
  terraform init
  terraform apply \
    -var="project_id=YOUR_PROJECT_ID" \
    -var="github_repo=OWNER/REPO" \
    -var="service_account_email=YOUR_SA@PROJECT.iam.gserviceaccount.com"

Step 2 — Grant projectIamAdmin (manual, run once)
  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:SA_EMAIL" \
    --role="roles/resourcemanager.projectIamAdmin"

Step 3 — Add GitHub Actions secrets
  GCP_PROJECT_ID, WIF_PROVIDER, WIF_SERVICE_ACCOUNT, DB_PASSWORD

Step 4 — Push to main or trigger workflow manually
  The CI/CD pipeline handles terraform plan → apply automatically
```

---

fixed (infra folder ): resolve IAM 403 by moving role bindings to bootstrap
The CI service account cannot grant itself IAM permissions — this is a
chicken-and-egg problem. When iam.tf tried to create google_project_iam_member
resources, the SA had no rights to read or modify the project IAM policy,
causing every binding to fail with:
  Error: Error retrieving IAM policy for project "***":
  googleapi: Error 403: The caller does not have permission, forbidden
All five bindings failed simultaneously:
  - roles/compute.networkAdmin    → compute_admin
  - roles/container.admin         → container_admin
  - roles/cloudsql.admin          → cloudsql_admin
  - roles/storage.admin           → storage_admin
  - roles/iam.serviceAccountUser  → service_account_user
This also caused vpc.tf to fail (compute.networks.create) because
compute.networkAdmin was never successfully granted.

 infra/bootstrap/main.tf  [UPDATED]
- feat: merged all google_project_iam_member resources from iam.tf into
  bootstrap, applied once manually by a project admin (not by the CI SA)
- feat: added roles/resourcemanager.projectIamAdmin binding so the SA can
  manage project IAM policy reads on subsequent Terraform runs
- Roles now granted via bootstrap:
    roles/compute.networkAdmin
    roles/container.admin
    roles/cloudsql.admin
    roles/storage.admin
    roles/iam.serviceAccountUser
    roles/resourcemanager.projectIamAdmin

 infra/iam.tf  [CLEARED]
- fix: removed all google_project_iam_member resource blocks
- Replaced file content with an explanatory comment pointing to
  infra/bootstrap/main.tf as the canonical location for IAM grants
- Main infra/ module no longer attempts to manage project IAM policy


 infra/variables.tf
- fix: removed variable "service_account_email" — no longer referenced
  by any resource in the main infra/ module after iam.tf was cleared

 .github/workflows/infrastructure.yml
- fix: removed -var="service_account_email=${{ secrets.WIF_SERVICE_ACCOUNT }}"
  from terraform plan command — variable no longer declared in main module;
  passing an undeclared variable causes terraform plan to exit 1
Final terraform plan command now passes exactly two -var flags:
  -var="project_id=${{ secrets.GCP_PROJECT_ID }}"
  -var="db_password=${{ secrets.DB_PASSWORD }}"
  (region and zone use defaults from variables.tf)
Manual prerequisite — run once before re-triggering workflow:
  PROJECT_ID="ecommerce-devops-498814"
  SA_EMAIL="YOUR_SA@ecommerce-devops-498814.iam.gserviceaccount.com"
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/compute.networkAdmin"
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/container.admin"
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/cloudsql.admin"
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/storage.admin"
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role="roles/iam.serviceAccountUser"

*Last updated: 2026-06-16 — 12 issues documented*
