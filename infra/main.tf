terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }

  backend "gcs" {
    bucket = "<GCP_PROJECT_ID>-tfstate"
    prefix = "terraform/state"
  }
}

# Configure the Google Provider

provider "google" {
  project = var.GCP_PROJECT_ID
  region  = var.region
  zone    = var.zone
}
