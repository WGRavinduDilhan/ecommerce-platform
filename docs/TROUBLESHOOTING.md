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
13. [Terraform Apply — 403 on All IAM Role Bindings (SA Self-Grant)](#13-terraform-apply--403-on-all-iam-role-bindings-sa-cannot-grant-itself-permissions)
14. [Cloud SQL / GKE — Missing VPC Private Peering and Wrong depends_on](#14-cloud-sql--gke--missing-vpc-private-peering-and-wrong-depends_on)

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

## 13. Terraform Apply — 403 on All IAM Role Bindings (SA Cannot Grant Itself Permissions)

**Files affected:** `infra/iam.tf`, `infra/bootstrap/main.tf`, `infra/variables.tf`, `.github/workflows/infrastructure.yml`

### 🔴 Error
```
google_project_iam_member.compute_admin: Creating...
google_project_iam_member.container_admin: Creating...
google_project_iam_member.storage_admin: Creating...
google_compute_network.vpc: Creating...
google_project_iam_member.cloudsql_admin: Creating...
google_project_iam_member.service_account_user: Creating...

│ Error: Request `Create IAM Members roles/compute.networkAdmin serviceAccount:***`
│ returned error: Final error: Error retrieving IAM policy for project "***":
│ googleapi: Error 403: The caller does not have permission, forbidden
│   with google_project_iam_member.compute_admin, on iam.tf line 11

│ Error: Request `Create IAM Members roles/container.admin serviceAccount:***`
│ returned error: Final error: Error retrieving IAM policy for project "***":
│ googleapi: Error 403: The caller does not have permission, forbidden
│   with google_project_iam_member.container_admin, on iam.tf line 17

│ Error: Request `Create IAM Members roles/cloudsql.admin serviceAccount:***`
│ returned error: Final error: Error retrieving IAM policy for project "***":
│ googleapi: Error 403: The caller does not have permission, forbidden
│   with google_project_iam_member.cloudsql_admin, on iam.tf line 23

│ Error: Request `Create IAM Members roles/storage.admin serviceAccount:***`
│ returned error: Final error: Error retrieving IAM policy for project "***":
│ googleapi: Error 403: The caller does not have permission, forbidden
│   with google_project_iam_member.storage_admin, on iam.tf line 29

│ Error: Request `Create IAM Members roles/iam.serviceAccountUser serviceAccount:***`
│ returned error: Final error: Error retrieving IAM policy for project "***":
│ googleapi: Error 403: The caller does not have permission, forbidden
│   with google_project_iam_member.service_account_user, on iam.tf line 35

│ Error: Error creating Network: googleapi: Error 403:
│ Required 'compute.networks.create' permission for
│ 'projects/***/global/networks/ecommerce-vpc', forbidden
│   with google_compute_network.vpc, on vpc.tf line 1
```

### 🔍 How We Identified It
- All five IAM member bindings failed at the same moment
- The specific error was `Error retrieving IAM policy for project` — not just "can't create", but the SA couldn't even **read** the current IAM policy
- The VPC creation failure came immediately after — it was a downstream effect because `compute.networkAdmin` was never granted
- Checked `infra/iam.tf` and confirmed it contained `google_project_iam_member` resources trying to grant roles to `var.service_account_email` — which is the **same service account running Terraform**
- This is a second chicken-and-egg problem: the SA needs `resourcemanager.projectIamAdmin` to modify IAM, but nobody had granted it that role yet

### 💡 Root Cause
A service account **cannot grant itself permissions**. To create or modify IAM policy bindings on a GCP project, the caller needs `resourcemanager.projects.setIamPolicy` and `resourcemanager.projects.getIamPolicy` — both included in `roles/resourcemanager.projectIamAdmin`. The CI service account had neither.

`iam.tf` was in the **main CI-managed Terraform module**, which means the same SA that is being granted roles was the one trying to execute the grants. This is a fundamental bootstrap paradox — the SA needs the roles before it can run the code that grants the roles.

```
iam.tf tries to grant:
  compute.networkAdmin     ─┐
  container.admin           │  ALL fail 403
  cloudsql.admin            │  SA has no rights to
  storage.admin             │  read/write IAM policy
  iam.serviceAccountUser   ─┘

vpc.tf also fails:
  compute.networks.create   ← because compute.networkAdmin was never granted
```

### ✅ Fix Applied

**Step 1 — Manual prerequisite (run once from your local machine with an admin account):**
```bash
PROJECT_ID="ecommerce-devops-498814"
SA_EMAIL="YOUR_SA@ecommerce-devops-498814.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/compute.networkAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/container.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/iam.serviceAccountUser"
```

**Step 2 — Moved all `google_project_iam_member` resources out of `iam.tf` into `infra/bootstrap/main.tf`:**

IAM role grants are now co-located with the WIF pool in bootstrap — both are one-time admin operations that must precede the CI pipeline.

```hcl
# infra/bootstrap/main.tf (section added)
locals {
  sa_member = "serviceAccount:${var.service_account_email}"
}

resource "google_project_iam_member" "compute_admin" {
  project = var.project_id
  role    = "roles/compute.networkAdmin"
  member  = local.sa_member
}
# ... container_admin, cloudsql_admin, storage_admin,
#     service_account_user, iam_admin (projectIamAdmin)
```

**Step 3 — Cleared `infra/iam.tf` to comments only:**
```hcl
# IAM role grants have been moved to infra/bootstrap/main.tf
# They must be applied once by a project admin, not by the CI SA.
```

**Step 4 — Removed `service_account_email` from `variables.tf`** (no longer used in main module):
```hcl
# REMOVED
variable "service_account_email" {
  type        = string
  description = "Email of the GitHub Actions service account"
}
```

**Step 5 — Removed `-var="service_account_email=..."` from workflow plan command:**
```yaml
# BEFORE
terraform plan \
  -var="project_id=${{ secrets.GCP_PROJECT_ID }}" \
  -var="db_password=${{ secrets.DB_PASSWORD }}" \
  -var="service_account_email=${{ secrets.WIF_SERVICE_ACCOUNT }}"  # ← removed

# AFTER — only two vars needed
terraform plan \
  -var="project_id=${{ secrets.GCP_PROJECT_ID }}" \
  -var="db_password=${{ secrets.DB_PASSWORD }}"
```

### 📁 Files Changed

| File | Change |
|---|---|
| `infra/bootstrap/main.tf` | Added all 6 `google_project_iam_member` resources + `locals.sa_member` |
| `infra/iam.tf` | Replaced all resources with explanatory comment |
| `infra/variables.tf` | Removed `variable "service_account_email"` |
| `.github/workflows/infrastructure.yml` | Removed `-var="service_account_email=..."` from plan command |

> **Rule:** IAM role bindings for a CI service account are a **bootstrap concern**, not a CI concern. The SA cannot manage the permissions that enable it to run. Always grant initial permissions manually via `gcloud` or a separately-applied admin Terraform config.

---

## 14. Cloud SQL / GKE — Missing VPC Private Peering and Wrong `depends_on`

**Files affected:** `infra/vpc.tf`, `infra/cloudsql.tf`, `infra/gke.tf`

### 🔴 Error
Cloud SQL instance creation failed with a network-related error because Cloud SQL with `ipv4_enabled = false` (private IP only) had no private network path configured. GKE cluster creation also experienced transient network failures due to missing ordering guarantees. The workflow showed errors similar to:
```
Error: Error creating DatabaseInstance: googleapi: Error 400:
Invalid value for field 'instance.settings.ipConfiguration.privateNetwork':
'projects/***/global/networks/ecommerce-vpc'.
Network must have private service connection configured.
```
And/or Terraform applied Cloud SQL before the VPC peering connection was ready, causing random `500 Internal Error` or `403` failures on the Cloud SQL creation step.

### 🔍 How We Identified It
- Cloud SQL was configured with `ipv4_enabled = false` and `private_network = google_compute_network.vpc.id`, meaning it **requires** a private service connection to Google's network
- Checked `vpc.tf` — the file only had `google_compute_network` and `google_compute_subnetwork` blocks. There was **no** `google_compute_global_address` (private IP range reservation) and **no** `google_service_networking_connection` (VPC peering to `servicenetworking.googleapis.com`)
- Without these two resources, GCP has no allocated IP range on the VPC to route private Cloud SQL traffic through
- Checked `cloudsql.tf` — `depends_on` pointed at `google_compute_network.vpc` instead of `google_service_networking_connection.private_vpc`. Terraform would consider the network "ready" as soon as the VPC resource was created, without waiting for peering to complete
- GKE had **no `depends_on` at all** — it could begin cluster creation before the network was fully configured

### 💡 Root Cause
Two separate problems compounding each other:

**Problem 1 — Missing resources in vpc.tf:**
`google_compute_global_address` reserves a CIDR block (e.g. `10.0.0.0/16`) in the VPC specifically for Google's internal services. `google_service_networking_connection` establishes the VPC peering to `servicenetworking.googleapis.com` using that reserved range. Without both, Cloud SQL with private IP simply has no network path to reach.

```
VPC (ecommerce-vpc)
  │
  ├─ subnet (10.0.0.0/18)        ← for workloads (pods/services)
  │
  └─ private IP range (missing)  ← NEEDED: reserved range for Google services
       │
       └─ VPC peering (missing)  ← NEEDED: connects to servicenetworking.googleapis.com
            │
            └─ Cloud SQL         ← can only be reached via this path
```

**Problem 2 — Wrong `depends_on` ordering:**
Even after adding the peering resources, if `depends_on` only references `google_compute_network.vpc`, Terraform starts creating Cloud SQL as soon as the VPC is created — but peering takes additional time to establish. This causes a race condition where Cloud SQL creation begins before the private network path exists.

### ✅ Fix Applied

**`infra/vpc.tf` — Added two missing resources:**
```hcl
# Step 1 — Reserve a private IP range for Google services
resource "google_compute_global_address" "private_ip" {
  name          = "private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
  project       = var.project_id
}

# Step 2 — Establish VPC peering to servicenetworking.googleapis.com
resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}
```

**`infra/cloudsql.tf` — Corrected `depends_on` to wait for peering:**
```hcl
# BEFORE — waits only for VPC to be created, not for peering to complete
depends_on = [google_compute_network.vpc]

# AFTER — waits for the full peering connection to be established
depends_on = [google_service_networking_connection.private_vpc]
```

**`infra/gke.tf` — Added missing `depends_on`:**
```hcl
resource "google_container_cluster" "primary" {
  name     = "ecommerce-cluster"
  location = var.region
  project  = var.project_id

  depends_on = [google_service_networking_connection.private_vpc]   # ← added

  # ... rest of config
}
```

**Correct resource creation order after fix:**
```
google_compute_network.vpc
  └─► google_compute_global_address.private_ip
        └─► google_service_networking_connection.private_vpc
              ├─► google_sql_database_instance.postgres   (depends_on peering)
              └─► google_container_cluster.primary        (depends_on peering)
```

### 📁 Files Changed

| File | Change |
|---|---|
| `infra/vpc.tf` | Added `google_compute_global_address.private_ip` and `google_service_networking_connection.private_vpc` |
| `infra/cloudsql.tf` | Changed `depends_on` from `google_compute_network.vpc` → `google_service_networking_connection.private_vpc` |
| `infra/gke.tf` | Added `depends_on = [google_service_networking_connection.private_vpc]` to cluster resource |

> **Rule:** Any resource that uses Cloud SQL private IP (`ipv4_enabled = false`) requires **both** a reserved IP range (`google_compute_global_address` with `purpose = VPC_PEERING`) and a service networking peering connection (`google_service_networking_connection`) in the same VPC. Always set `depends_on` to point at the peering connection, not just the VPC network.

---

## Master Summary — All Issues Found & Fixed

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | CI/CD | Artifact upload had no `if:` guard — uploaded nothing when plan was skipped | ✅ Fixed |
| 2 | Terraform | `gke.tf`, `cloudsql.tf`, `vpc.tf` were 0-byte empty files — nothing to plan | ✅ Fixed |
| 3 | Terraform | `> plan.json` swallowed stderr — all errors invisible in logs | ✅ Fixed |
| 4 | Terraform | `github_repo` not passed via `-var` — plan hung on interactive prompt | ✅ Fixed |
| 5 | GCP IAM | WIF pool in `iam.tf` tried to recreate existing pool — chicken-and-egg 403 | ✅ Fixed |
| 6 | GCP IAM | Service account had zero infrastructure permissions — all API calls 403 | ✅ Fixed (gcloud) |
| 7 | Cloud SQL | `require_ssl` removed in provider v5+ — replaced with `ssl_mode` | ✅ Fixed |
| 8 | Terraform | `output "gke_cluster_name"` never declared — apply job `terraform output` failed | ✅ Fixed |
| 9 | Terraform | `service_account_email` declared in both `iam.tf` and `variables.tf` — duplicate var | ✅ Fixed |
| 10 | Terraform | `local.github_repo` and `var.github_repo` orphaned after bootstrap split — tflint exit 2 | ✅ Fixed |
| 11 | GCP IAM | SA tried to grant itself roles via `iam.tf` — can't read/write its own IAM policy | ✅ Fixed |
| 12 | Kubernetes | `selector.matchLabels` missing `version: v1` — mismatch with pod template labels | ✅ Fixed |
| 13 | Kubernetes | Frontend Service `type: LoadBalancer` — bypassed Ingress, TLS, and routing rules | ✅ Fixed |
| 14 | Kubernetes | `order-service` and `frontend` missing `securityContext` hardening | ✅ Fixed |
| 15 | Kubernetes | Frontend referenced `serviceAccountName: frontend` — no ServiceAccount declared | ✅ Fixed |
| 16 | Kubernetes | No PDB, no anti-affinity, no startupProbe, no `/tmp` volume on `frontend` | ✅ Fixed |
| 17 | Terraform | `vpc.tf` missing VPC private peering; `depends_on` pointed at VPC not peering — Cloud SQL/GKE race condition | ✅ Fixed |

---

## Required GitHub Actions Secrets

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID (e.g. `ecommerce-devops-498814`) |
| `WIF_PROVIDER` | Full WIF provider name (output from bootstrap) |
| `WIF_SERVICE_ACCOUNT` | Service account email used by GitHub Actions |
| `DB_PASSWORD` | Cloud SQL app user password |
| `SLACK_WEBHOOK_URL` | Optional — Slack webhook for deployment notifications |

---

## Infra Deployment Order (First Time Setup)

```
Step 1 — Bootstrap (manual, run once by a project admin)
  cd infra/bootstrap
  terraform init
  terraform apply \
    -var="project_id=YOUR_PROJECT_ID" \
    -var="github_repo=OWNER/REPO" \
    -var="service_account_email=YOUR_SA@PROJECT.iam.gserviceaccount.com"

  This creates: WIF pool, WIF provider, WIF→SA binding, and all IAM role grants.

Step 2 — Add GitHub Actions secrets
  GCP_PROJECT_ID, WIF_PROVIDER, WIF_SERVICE_ACCOUNT, DB_PASSWORD

Step 3 — Push to main or trigger workflow manually
  The CI/CD pipeline handles terraform plan → apply automatically.
  Only two -var flags are needed:
    -var="project_id=..."
    -var="db_password=..."
```

---

*Last updated: 2026-06-19 — 17 issues documented across Terraform, GCP IAM, CI/CD, and Kubernetes*
