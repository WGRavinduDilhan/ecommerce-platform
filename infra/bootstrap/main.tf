# ============================================================
# BOOTSTRAP — Run ONCE manually before any CI/CD pipeline.
# Applied by a GCP project ADMIN (your personal Google account),
# NOT by the CI service account.
#
# This configures:
#   1. Workload Identity Federation (WIF pool + provider)
#   2. WIF → Service Account binding
#   3. All IAM roles the CI service account needs to run Terraform
#
# How to apply:
#   cd infra/bootstrap
#   terraform init
#   terraform apply \
#     -var="project_id=ecommerce-devops-498814" \
#     -var="github_repo=WGRavinduDilhan/ecommerce-platform" \
#     -var="service_account_email=YOUR_SA@ecommerce-devops-498814.iam.gserviceaccount.com"
# ============================================================

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in owner/repo format"
}

variable "service_account_email" {
  type        = string
  description = "Email of the service account used by GitHub Actions"
}

provider "google" {
  project = var.project_id
}

# ─── 1. Workload Identity Pool ────────────────────────────────────────────────

resource "google_iam_workload_identity_pool" "pool" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Pool"
  project                   = var.project_id
}

resource "google_iam_workload_identity_pool_provider" "provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  project                            = var.project_id
  attribute_condition                = "attribute.repository == '${var.github_repo}'"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# ─── 2. Allow GitHub Actions to impersonate the service account via WIF ───────

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.service_account_email}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.pool.name}/attribute.repository/${var.github_repo}"
}

# ─── 3. IAM roles the CI service account needs to run terraform apply ─────────
#
# These are moved here from infra/iam.tf because the CI SA cannot grant itself
# permissions — it is a chicken-and-egg problem. A project admin must apply
# these once via bootstrap before the CI pipeline can manage infrastructure.

locals {
  sa_member = "serviceAccount:${var.service_account_email}"
}

resource "google_project_iam_member" "compute_admin" {
  project = var.project_id
  role    = "roles/compute.networkAdmin"
  member  = local.sa_member
}

resource "google_project_iam_member" "container_admin" {
  project = var.project_id
  role    = "roles/container.admin"
  member  = local.sa_member
}

resource "google_project_iam_member" "cloudsql_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = local.sa_member
}

resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = local.sa_member
}

resource "google_project_iam_member" "service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = local.sa_member
}

resource "google_project_iam_member" "iam_admin" {
  project = var.project_id
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = local.sa_member
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "wif_provider" {
  description = "Full WIF provider name — use as WIF_PROVIDER secret"
  value       = google_iam_workload_identity_pool_provider.provider.name
}

output "service_account" {
  description = "Service account email — use as WIF_SERVICE_ACCOUNT secret"
  value       = var.service_account_email
}
