#!/bin/bash

# Zoho Catalyst Deployment Script
# Database: Zoho Catalyst Cloud Scale DB (MySQL)
# Usage: bash zoho-deploy.sh

set -e

echo "================================"
echo "AccountantsFactory Zoho Catalyst Deployment"
echo "================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm found: $(npm -v)${NC}"

# Check for Catalyst CLI
if ! command -v zcatalyst &> /dev/null; then
    echo -e "${YELLOW}⚠️  Catalyst CLI not found. Installing...${NC}"
    npm install -g zcatalyst-cli
    echo -e "${GREEN}✅ Catalyst CLI installed${NC}"
else
    echo -e "${GREEN}✅ Catalyst CLI found: $(zcatalyst --version)${NC}"
fi

# Step 2: Navigate to API directory
echo ""
echo -e "${YELLOW}Step 2: Setting up API directory...${NC}"
cd "$(dirname "$0")/api" || exit 1
echo -e "${GREEN}✅ Working directory: $(pwd)${NC}"

# Step 3: Setup environment
echo ""
echo -e "${YELLOW}Step 3: Setting up environment...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.zoho.template ]; then
        cp .env.zoho.template .env
        echo -e "${YELLOW}⚠️  Created .env from template${NC}"
        echo -e "${YELLOW}⚠️  Edit .env and fill in your Catalyst Cloud Scale DB credentials${NC}"
        echo -e "${YELLOW}⚠️  DATABASE_URL format: mysql://USER:PASS@CATALYST_HOST:3306/accountantsfactory${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Step 4: Install dependencies
echo ""
echo -e "${YELLOW}Step 4: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 5: Regenerate Prisma for Linux/Catalyst
echo ""
echo -e "${YELLOW}Step 5: Generating Prisma Client for Catalyst Linux environment...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated (MySQL, multi-platform binaries)${NC}"

# Step 6: Push schema to Zoho Catalyst Cloud Scale DB
echo ""
echo -e "${YELLOW}Step 6: Pushing schema to Zoho Catalyst Cloud Scale DB (MySQL)...${NC}"
echo -e "${YELLOW}   Make sure DATABASE_URL in .env points to your Cloud Scale DB${NC}"
if npx prisma db push 2>&1 | grep -qi "error\|failed"; then
    echo -e "${RED}❌ Database schema push failed${NC}"
    echo -e "${RED}   Check: DATABASE_URL in .env is correct (MySQL format)${NC}"
    echo -e "${RED}   Format: mysql://USER:PASS@CATALYST_HOST:3306/accountantsfactory${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database schema applied to Cloud Scale DB${NC}"

# Step 7: Create admin user
echo ""
echo -e "${YELLOW}Step 7: Creating admin user (optional)...${NC}"
read -p "Do you want to create an admin user? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter admin email: " ADMIN_EMAIL
    read -s -p "Enter admin password: " ADMIN_PASSWORD
    echo
    node scripts/createAdmin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
    echo -e "${GREEN}✅ Admin user created${NC}"
fi

# Step 8: Deploy to Zoho Catalyst
echo ""
echo -e "${YELLOW}Step 8: Deploying to Zoho Catalyst...${NC}"
cd ..  # back to project root where catalyst.json is

echo -e "${YELLOW}   Logging in to Zoho Catalyst (browser will open)...${NC}"
zcatalyst login

echo -e "${YELLOW}   Deploying function and web client...${NC}"
zcatalyst deploy --only functions,client

echo ""
echo "================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Go to Catalyst Dashboard → Advanced I/O Functions"
echo "2. Set Environment Variables (copy from api/.env):"
echo "   - DATABASE_URL (your Cloud Scale DB MySQL URL)"
echo "   - JWT_SECRET"
echo "   - NODE_ENV=production"
echo "   - FRONTEND_URL=https://accountantsfactory.com"
echo "   - SMTP_HOST, SMTP_USER, SMTP_PASS"
echo "   - ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, etc."
echo ""
echo "3. Test API: curl https://YOUR-APP.catalystappsail.com/api/health"
echo ""
