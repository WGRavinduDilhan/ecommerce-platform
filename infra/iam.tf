# Grant the GitHub Actions service account all roles needed to
# manage infrastructure via Terraform.
# The WIF pool/provider that enables this authentication is
# managed separately in infra/bootstrap/ (one-time manual apply).


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
