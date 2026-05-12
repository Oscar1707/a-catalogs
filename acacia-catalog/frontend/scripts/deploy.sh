#!/usr/bin/env bash
# Deploy del SPA Acacia al bucket S3 + invalidación CloudFront.
# Requiere: AWS CLI configurada, npm build exitoso.

set -euo pipefail

BUCKET="acacia-catalog-spa"
DISTRIBUTION_ID="E38C3UTB2ISSEA"
REGION="us-east-1"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "→ Build…"
npm run build

echo "→ Sync dist/ → s3://${BUCKET}"
aws s3 sync dist/ "s3://${BUCKET}" \
  --delete \
  --region "${REGION}" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# index.html sin cache (siempre fresco)
aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --region "${REGION}" \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html"

echo "→ Invalidando CloudFront ${DISTRIBUTION_ID}"
aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*" \
  --no-cli-pager

echo "✓ Deploy completo → https://d2pgrgppb9pktx.cloudfront.net"
