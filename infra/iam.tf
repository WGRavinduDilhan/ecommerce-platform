# IAM role grants for the GitHub Actions service account have been moved to
# infra/bootstrap/main.tf — they must be applied once by a project admin,
# not by the CI pipeline itself (the SA cannot grant itself permissions).
#
# See infra/bootstrap/main.tf for all google_project_iam_member resources.
