#!/bin/bash

# CI/CD Pipeline Setup Script
# This script sets up GitHub Actions secrets and repository configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}CI/CD Pipeline Setup${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner --q '.nameWithOwner')
if [ -z "$REPO" ]; then
    echo -e "${RED}Could not determine repository. Are you in a Git repository?${NC}"
    exit 1
fi

echo -e "${GREEN}Repository: $REPO${NC}"
echo ""

# Function to set secrets
set_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if [ -z "$secret_value" ]; then
        echo -e "${YELLOW}Skipping $secret_name (empty value)${NC}"
        return
    fi
    
    echo -n "$secret_value" | gh secret set "$secret_name" -R "$REPO"
    echo -e "${GREEN}✓ Set secret: $secret_name${NC}"
}

# Prompt for secrets
echo -e "${YELLOW}Enter your GCP Project ID:${NC}"
read -r GCP_PROJECT_ID

echo -e "${YELLOW}Enter path to GCP Service Account JSON key:${NC}"
read -r GCP_SA_KEY_PATH

if [ ! -f "$GCP_SA_KEY_PATH" ]; then
    echo -e "${RED}File not found: $GCP_SA_KEY_PATH${NC}"
    exit 1
fi

GCP_SA_KEY=$(cat "$GCP_SA_KEY_PATH")

echo -e "${YELLOW}Enter Slack Webhook URL (optional, press Enter to skip):${NC}"
read -r SLACK_WEBHOOK

# Set secrets
echo ""
echo -e "${YELLOW}Setting secrets...${NC}"

set_secret "GCP_PROJECT_ID" "$GCP_PROJECT_ID"
set_secret "GCP_SA_KEY" "$GCP_SA_KEY"
set_secret "SLACK_WEBHOOK" "$SLACK_WEBHOOK"

echo ""
echo -e "${YELLOW}Configuring repository settings...${NC}"

# Enable branch protection on main
echo -e "${YELLOW}Note: Run this command to enable branch protection:${NC}"
echo ""
echo "gh api repos/$REPO/branches/main/protection -X PUT \\"
echo "  -f required_status_checks='{\"strict\": true, \"contexts\": [\"ci-main.yml\"]}' \\"
echo "  -f enforce_admins=true \\"
echo "  -f require_code_owner_reviews=true \\"
echo "  -f required_approving_review_count=1"
echo ""

# Create environments
echo -e "${YELLOW}Creating GitHub environments...${NC}"

for env in staging production; do
    echo -e "${GREEN}Setting up environment: $env${NC}"
    
    # Note: GitHub CLI doesn't directly support creating environments
    # This must be done through the web UI or API
    echo -e "${YELLOW}Please manually create the '$env' environment in GitHub:${NC}"
    echo "1. Go to Settings → Environments"
    echo "2. Click 'New environment'"
    echo "3. Name: $env"
    echo "4. Add protection rules for production"
    echo ""
done

echo -e "${GREEN}✓ Secrets configured${NC}"
echo ""
echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""
echo "1. Create GitHub Environments (staging, production)"
echo "   Settings → Environments → New environment"
echo ""
echo "2. Enable branch protection on main"
echo "   Settings → Branches → main → Edit"
echo ""
echo "3. Configure deployment protection rules"
echo "   Require reviewers approval for production"
echo ""
echo "4. Set environment-specific secrets:"
echo "   - Go to Settings → Environments → [staging/production]"
echo "   - Add any environment-specific secrets"
echo ""
echo "5. Review workflow files in .github/workflows/"
echo ""
echo "6. Push changes to trigger CI pipeline"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
