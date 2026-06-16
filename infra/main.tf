terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }

  backend "gcs" {
    bucket = "ecommerce-devops-498814-tfstate"
    prefix = "terraform/state"
  }
}

# Configure the Google Provider

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

