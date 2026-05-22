# CI/CD Configuration Examples

## Environment Variables

### Development (.env.dev)
```
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/productdb
ORDER_DATABASE_URL=postgresql://user:password@localhost:5433/orderdb
REDIS_URL=redis://localhost:6379
FRONTEND_ORIGIN=http://localhost:5173
API_TIMEOUT=30
LOG_LEVEL=debug
```

### Staging (.env.staging)
```
NODE_ENV=staging
DATABASE_URL=postgresql://user:password@product-db-staging:5432/productdb
ORDER_DATABASE_URL=postgresql://user:password@order-db-staging:5433/orderdb
REDIS_URL=redis://redis-staging:6379
FRONTEND_ORIGIN=https://staging.ecommerce.example.com
API_TIMEOUT=30
LOG_LEVEL=info
```

### Production (.env.production)
```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@product-db-prod:5432/productdb
ORDER_DATABASE_URL=postgresql://user:password@order-db-prod:5433/orderdb
REDIS_URL=redis://redis-prod:6379
FRONTEND_ORIGIN=https://ecommerce.example.com
API_TIMEOUT=30
LOG_LEVEL=warn
```

## GitHub Actions Secrets

Required repository secrets:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Service account JSON key for GCP
- `SLACK_WEBHOOK`: Slack webhook for notifications

## Docker Registry Configuration

### GitHub Container Registry (GHCR)

Login:
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
```

Build and push:
```bash
docker build -t ghcr.io/owner/ecommerce/product-service:v1.0.0 .
docker push ghcr.io/owner/ecommerce/product-service:v1.0.0
```

## Kubernetes Configuration

### Create namespace
```bash
kubectl create namespace ecommerce
```

### Create secrets
```bash
kubectl create secret generic product-db-credentials \
  --from-literal=url=postgresql://user:pass@host/db \
  -n ecommerce

kubectl create secret generic order-db-credentials \
  --from-literal=url=postgresql://user:pass@host/db \
  -n ecommerce
```

### Deploy manifests
```bash
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/networking-and-policies.yaml
```

## Monitoring Setup

### GKE Monitoring
```bash
# Enable GKE monitoring
gcloud container clusters update ecommerce-prod \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --logging=SYSTEM_COMPONENTS,WORKLOADS \
  --monitoring=SYSTEM_COMPONENTS,WORKLOADS
```

### View logs
```bash
# Pod logs
kubectl logs deployment/product-service -n ecommerce

# Stream logs
kubectl logs -f deployment/product-service -n ecommerce

# View cluster events
kubectl get events -n ecommerce --sort-by='.lastTimestamp'
```

## Pipeline Customization

### Skip CI for certain commits
Add `[skip ci]` to commit message:
```bash
git commit -m "Update docs [skip ci]"
```

### Manual workflow dispatch
```bash
# Deploy to production manually
gh workflow run deploy-production.yml --ref main -f environment=production
```

### View workflow runs
```bash
# List recent runs
gh run list

# View run details
gh run view <run-id>

# Watch run in real-time
gh run watch <run-id>
```

## Performance Tuning

### Docker Layer Caching
The pipeline uses GitHub Actions cache for Docker layers:
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

### Dependency Caching
Node.js and Python dependencies are cached:
- Node: `npm-lock` cache key
- Python: `requirements.txt` cache key

### Parallel Execution
- Service CI jobs run in parallel
- Docker builds run concurrently
- Tests execute simultaneously

## Cost Optimization

### GKE Cost Reduction
- Use Preemptible VMs for non-critical workloads
- Enable cluster autoscaling
- Set resource requests/limits
- Use Pod Disruption Budgets

### GitHub Actions Cost
- Use branch-specific workflows
- Cache dependencies aggressively
- Run integration tests on schedule, not every commit
- Parallel matrix jobs reduce wall-clock time

## Security Best Practices

### Secret Management
- Use GitHub Secrets, never hardcode
- Rotate credentials regularly
- Use short-lived tokens for service accounts
- Enable secret scanning

### Container Security
- Scan images with Trivy
- Use minimal base images
- Run as non-root user
- Enable Pod Security Policies

### Network Security
- Use NetworkPolicies
- Implement service mesh for mTLS
- Use Private GKE clusters
- Enable VPC Service Controls

## Troubleshooting

### Check workflow syntax
```bash
gh workflow list
gh workflow view ci-main.yml
```

### Debug failed jobs
```bash
# View run logs
gh run view <run-id> --log

# View specific job
gh run view <run-id> -j job-name
```

### Local testing
```bash
# Test docker-compose
docker-compose config
docker-compose up --build

# Run tests locally
cd services/product-service && pytest
cd services/frontend && npm test
```

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Kubernetes Engine Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Docker Security Best Practices](https://docs.docker.com/develop/dev-best-practices/)
