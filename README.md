# E-commerce Microservices Platform

A modern, scalable, and fully containerized E-commerce platform built with a robust microservices architecture. It features full Infrastructure-as-Code (IaC) and is designed to run seamlessly both locally and in the cloud on Google Kubernetes Engine (GKE) with Cloud SQL (PostgreSQL), Redis, RabbitMQ, and Elasticsearch.

---

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Microservices Overview](#microservices-overview)
- [Getting Started (Local Development)](#getting-started-local-development)
  - [Standard Setup](#standard-setup)
  - [Enhanced Setup (All Services)](#enhanced-setup-all-services)
- [Infrastructure & Deployment (GCP + Terraform)](#infrastructure--deployment-gcp--terraform)
- [CI/CD Pipelines](#cicd-pipelines)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## System Overview

This system is a comprehensive E-commerce platform broken down into scalable, domain-specific microservices. It handles everything from user authentication and product cataloging to order processing, payments, reviews, and notifications. 

The platform relies on event-driven communication (via RabbitMQ) between services and leverages caching (Redis) and advanced search capabilities (Elasticsearch) to provide a highly performant and resilient architecture. It is fully containerized using Docker and orchestrated using Kubernetes, with all required cloud infrastructure provisioned via Terraform on Google Cloud Platform (GCP).

---

## Tech Stack

- **Frontend:** React.js, Vite
- **Backend Services:** Python (FastAPI), Node.js (Express)
- **Primary Databases:** PostgreSQL (Google Cloud SQL in production)
- **Caching & Message Broker:** Redis, RabbitMQ
- **Search Engine:** Elasticsearch
- **Infrastructure as Code (IaC):** Terraform
- **Containerization & Orchestration:** Docker, Docker Compose, Kubernetes (Google Kubernetes Engine - GKE)
- **CI/CD:** GitHub Actions
- **Security & IAM:** GCP Workload Identity Federation (WIF)

---

## Architecture

```text
ecommerce-platform/
├── .github/workflows/       # CI/CD pipelines (Build, Test, Security, Deploy)
├── docs/                    # Extensive technical documentation
├── infra/                   # Terraform code for GCP (VPC, GKE, Cloud SQL, IAM)
├── k8s/                     # Kubernetes manifests (Deployments, Services, ConfigMaps)
├── scripts/                 # Utility and automation scripts
└── services/                # Microservices source code
    ├── auth-service/        # Node.js - JWT Authentication & OAuth
    ├── frontend/            # React/Vite - User Interface
    ├── notification-service/# Node.js - Email, SMS, & Push Notifications
    ├── order-service/       # Node.js - Order processing
    ├── payment-service/     # Node.js - Payment gateway integrations (Stripe, PayPal)
    ├── product-service/     # Python/FastAPI - Product catalog & search
    └── review-service/      # Node.js - Product reviews & ratings
```

---

## Microservices Overview

| Service | Technology | Port | Description |
|---|---|---|---|
| **`frontend`** | React (Vite) | `5173` | Main user-facing web application. |
| **`product-service`** | Python (FastAPI) | `8000` | Manages the product catalog, inventory, and integrates with Elasticsearch. |
| **`auth-service`** | Node.js (Express) | `3001` | Handles user registration, login, JWT issuance, and OAuth. |
| **`order-service`** | Node.js (Express) | `3000` | Manages order creation, status tracking, and history. |
| **`payment-service`** | Node.js (Express) | `3002` | Integrates with Stripe/PayPal to process transactions securely. |
| **`review-service`** | Node.js (Express) | `3003` | Manages user reviews and ratings for products. |
| **`notification-service`** | Node.js (Express) | `3006` | Consumes messages from RabbitMQ to send Emails/SMS. |

> **Note:** Each backend service maintains its own isolated PostgreSQL database schema, strictly adhering to microservices best practices.

---

## Getting Started (Local Development)

### Standard Setup

For lightweight development (Frontend + Core Products & Orders):
```bash
docker-compose up --build
```

### Enhanced Setup (All Services)

To run the complete ecosystem locally, including all microservices, Redis, RabbitMQ, and Elasticsearch:

```bash
docker-compose -f docker-compose.enhanced.yml up --build
```

#### Local Endpoints
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Product API:** [http://localhost:8000](http://localhost:8000)
- **Auth API:** [http://localhost:3001](http://localhost:3001)
- **Order API:** [http://localhost:3000](http://localhost:3000)
- **RabbitMQ Management UI:** [http://localhost:15672](http://localhost:15672) (guest/guest)
- **Elasticsearch:** [http://localhost:9200](http://localhost:9200)

---

## Infrastructure & Deployment (GCP + Terraform)

The infrastructure is completely codified using Terraform in the `infra/` directory.

### 1. One-Time Bootstrap (Workload Identity Federation)
Before CI/CD can run, you must bootstrap the WIF pool to allow GitHub Actions to authenticate to GCP without long-lived keys.

```bash
cd infra/bootstrap
terraform init
terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="service_account_email=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

### 2. GitHub Actions Secrets
Configure the following secrets in your GitHub repository:
- `GCP_PROJECT_ID`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `DB_PASSWORD`

*(Note: Never commit `terraform.tfvars` containing sensitive data. CI pipelines inject required variables automatically.)*

---

## CI/CD Pipelines

Automated workflows are defined in `.github/workflows/`:

- **Infrastructure (`infrastructure.yml`):** Runs `terraform plan` on PRs and `terraform apply` on merge to `main`.
- **Docker Build (`docker-build.yml`):** Builds and pushes container images for all updated services.
- **Continuous Integration (`ci-main.yml`):** Enforces code quality, runs unit tests, and validates builds.
- **Security Scanning (`security-scan.yml`):** Static code analysis and container vulnerability scanning (Trivy, Semgrep, CodeQL).

---

## Security

Security is embedded at every layer:
- **Containers:** Run as non-root (`runAsUser: 1000`) with dropped Linux capabilities.
- **Network:** Cloud SQL enforces SSL-only connections (`ssl_mode: ENCRYPTED_ONLY`).
- **Auth:** Keyless GCP authentication via Workload Identity Federation.
- **Resilience:** Kubernetes Pod Disruption Budgets (PDBs) and anti-affinity rules prevent downtime.

---

## Troubleshooting

Currently in Deployment phrase and still cheking code qualities in order to make it 100% secure and working with all features as expected
---