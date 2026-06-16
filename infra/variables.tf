
variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "github_repo" {
  type        = string
  description = "GitHub Repository (owner/repo)"
}

variable "service_account_email" {
  type        = string
  description = "Email of the GitHub Actions service account"
}
