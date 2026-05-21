variable "GCP_PROJECT_ID" {
  type = string
}

variable "region" {
  default = "us-central1"
}

variable "zone" {
  default = "us-central1-a"
}

variable "db_password" {
  type      = string
  sensitive = true
}
