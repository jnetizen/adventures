#!/bin/bash
# Deploy script that handles Git LFS properly
# Usage: ./scripts/deploy.sh

set -e

echo "Building project..."
npm run build

echo "Preparing deployment folder..."
rm -rf /tmp/adventures-deploy
mkdir -p /tmp/adventures-deploy
cp -r dist/* /tmp/adventures-deploy/
cp vercel.json /tmp/adventures-deploy/

echo "Deploying to Vercel..."
cd /tmp/adventures-deploy
vercel --prod --yes

echo "Done! Site is live at https://adventures-deploy.vercel.app"
