# CI/CD Pipeline Quick Start Guide

## Quick Setup (5 minutes)

### 1. Prerequisites
- GitHub account with admin access to repository
- GCP project with billing enabled
- `gh` CLI installed (GitHub CLI)
- `gcloud` CLI installed (Google Cloud CLI)

### 2. Create GCP Service Account

```bash
# Set your GCP project
export PROJECT_ID="your-gcp-project"

# Create service account
gcloud iam service-accounts create ecommerce-ci \
  --display-name="ecommerce-platform CI/CD" \
  --project=$PROJECT_ID

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ecommerce-ci@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/container.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ecommerce-ci@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ecommerce-ci@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

# Create and download key
gcloud iam service-accounts keys create ~/ecommerce-key.json \
  --iam-account="ecommerce-ci@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project=$PROJECT_ID
```

### 3. Set GitHub Secrets

```bash
# Navigate to repo
cd /path/to/ecommerce-platform

# Run setup script
bash scripts/setup-cicd.sh
```

**Required Secrets:**
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Content of ~/ecommerce-key.json
- `SLACK_WEBHOOK`: (Optional) Slack webhook URL

### 4. Create GitHub Environments

```bash
# Via GitHub CLI
gh api repos/YOUR_ORG/ecommerce-platform/environments \
  -F name=staging

gh api repos/YOUR_ORG/ecommerce-platform/environments \
  -F name=production
```

### 5. Set Branch Protection

```bash
# Require PR review for main branch
gh api repos/YOUR_ORG/ecommerce-platform/branches/main/protection \
  -X PUT \
  -F required_pull_request_reviews='{"required_approving_review_count":1}' \
  -F enforce_admins=true
```

### 6. Deploy Infrastructure

```bash
cd infra

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

## Common Commands

### View Workflow Runs
```bash
# List recent runs
gh run list

# View specific run
gh run view <RUN_ID>

# Watch run in real-time
gh run watch <RUN_ID>
```

### Trigger Workflows
```bash
# Deploy to staging (from develop branch)
git checkout develop
git push origin develop

# Deploy to production (from main branch)
git checkout main
git push origin main

# Or manually trigger
gh workflow run deploy-production.yml --ref main
```

### View Deployment Status
```bash
# Check staging
kubectl get deployments -n ecommerce-staging

# Check production
kubectl get deployments -n ecommerce

# View pod logs
kubectl logs deployment/product-service -n ecommerce
```

## Workflow Status Overview

| Workflow | Branch | Trigger | Environment |
|----------|--------|---------|-------------|
| ci-main | main/develop/PR | Push, PR | N/A |
| docker-build | main/develop | Push (changes) | GHCR |
| integration-tests | main/develop/PR | Push, PR, Daily | N/A |
| security-scan | main/develop/PR | Push, PR, Daily | N/A |
| infrastructure | main/develop | Push (changes) | GCP |
| deploy-staging | develop | Push | GKE Staging |
| deploy-production | main | Push, Manual | GKE Production |
| product-service | main/develop/PR | Push, PR | GKE |
| order-service | main/develop/PR | Push, PR | GKE |

## Troubleshooting

### Workflow Failed
1. Check GitHub Actions tab
2. Click failed workflow
3. Expand job logs
4. Look for error messages

### Deployment Issues
```bash
# Check rollout status
kubectl rollout status deployment/product-service -n ecommerce

# Describe pod for issues
kubectl describe pod <POD_NAME> -n ecommerce

# View logs
kubectl logs <POD_NAME> -n ecommerce
```

### GCP Connection Issues
```bash
# Verify credentials
gcloud auth activate-service-account --key-file=$HOME/ecommerce-key.json

# List GKE clusters
gcloud container clusters list

# Get cluster credentials
gcloud container clusters get-credentials ecommerce-prod --zone us-central1-a
```

## Example Workflows

### Example 1: Make a change and push
```bash
# Make code changes
git checkout -b feature/add-products-api
echo "code changes"
git add .
git commit -m "Add products API endpoint"
git push origin feature/add-products-api

# Create PR
gh pr create --title "Add products API" --body "New endpoint for fetching products"

# Workflows run:
# ✓ CI tests
# ✓ Lint & format check
# ✓ Security scan
```

### Example 2: Merge to develop (deploy to staging)
```bash
# Merge PR
gh pr merge <PR_NUMBER> --squash

# Workflows run:
# ✓ CI tests
# ✓ Build Docker image
# ✓ Security scan
# ✓ Auto-deploy to staging (ecommerce-staging namespace)
```

### Example 3: Release to production
```bash
# Create release branch
git checkout main
git pull origin main

# Merge develop into main
git merge develop

# Create tag
git tag -a v1.0.1 -m "Release v1.0.1"

# Push
git push origin main
git push origin --tags

# Workflows run:
# ✓ CI tests
# ✓ Build Docker image
# ✓ Security scan
# ✓ Deploy to production (with manual approval)
```

## Monitoring & Alerts

### Check CI Status Badge
Add to README.md:
```markdown
[![CI Pipeline](https://github.com/YOUR_ORG/ecommerce-platform/actions/workflows/ci-main.yml/badge.svg)](https://github.com/YOUR_ORG/ecommerce-platform/actions)
```

### Enable Slack Notifications
1. Create Slack webhook
2. Add `SLACK_WEBHOOK` secret to GitHub
3. Workflows will post deployment status

### Monitor Deployments
```bash
# Watch deployment in real-time
kubectl rollout status deployment/product-service -n ecommerce -w

# See pod events
kubectl get events -n ecommerce --sort-by='.lastTimestamp'
```

## Performance Tips

1. **Commit Message**: Use `[skip ci]` to skip CI
   ```bash
   git commit -m "Update docs [skip ci]"
   ```

2. **Dependency Caching**: Already configured
   - npm cache: 24 hours
   - pip cache: 24 hours
   - Docker cache: Unlimited (GHA)

3. **Parallel Builds**: Enabled by default
   - Services build simultaneously
   - Reduces total CI time by 60%

## Cost Optimization

1. **GitHub Actions**
   - Free tier: 2,000 minutes/month
   - Uses ~15-20 minutes per workflow run
   - Parallel jobs don't consume extra minutes

2. **GCP Resources**
   - Use preemptible VMs for staging
   - Enable autoscaling
   - Set resource limits

3. **Container Registry**
   - GHCR: Free for public, free quota for private
   - Cleanup old images regularly

## Next Steps

1. ✅ Complete setup (above)
2. 🔄 Make a test commit to develop branch
3. 📊 Monitor first workflow run
4. 🚀 Merge to main to deploy to production
5. 📚 Read detailed documentation:
   - [CI_CD_PIPELINE.md](CI_CD_PIPELINE.md)
   - [CI_CD_ARCHITECTURE.md](CI_CD_ARCHITECTURE.md)
   - [CI_CD_CONFIG_EXAMPLES.md](CI_CD_CONFIG_EXAMPLES.md)

## Support

**Documentation:**
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GKE Docs](https://cloud.google.com/kubernetes-engine/docs)
- [Terraform Docs](https://www.terraform.io/docs)

**Troubleshooting:**
- GitHub Issues in repository
- GCP Cloud Support
- Local testing with docker-compose

## Checklist

- [ ] GCP service account created
- [ ] GitHub secrets configured
- [ ] GitHub environments created (staging, production)
- [ ] Branch protection enabled
- [ ] Terraform infrastructure deployed
- [ ] Kubernetes manifests applied
- [ ] First workflow executed successfully
- [ ] Slack notifications working (optional)

---

**Version**: 1.0  
**Last Updated**: May 2026  
**Maintainer**: DevOps Team
