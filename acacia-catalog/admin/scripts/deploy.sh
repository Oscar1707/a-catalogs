#!/usr/bin/env bash
# Deploy del SPA admin al bucket S3 + invalidación CloudFront.
# Requiere: AWS CLI configurada, build local exitoso.

set -euo pipefail

BUCKET="acacia-admin-spa"
REGION="us-east-1"

# El distribution ID se carga dinámicamente desde el output de SAM
# (la primera vez aún no existe; se rellena tras `sam deploy`).
DISTRIBUTION_ID="${ADMIN_DISTRIBUTION_ID:-}"
if [ -z "$DISTRIBUTION_ID" ]; then
  DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name acacia-catalog \
    --query "Stacks[0].Outputs[?OutputKey=='AdminDistributionId'].OutputValue" \
    --output text --region "$REGION" 2>/dev/null || echo "")
fi

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

if [ -n "$DISTRIBUTION_ID" ]; then
  echo "→ Invalidando CloudFront ${DISTRIBUTION_ID}"
  aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*" \
    --no-cli-pager
else
  echo "⚠ AdminDistributionId no encontrado — omitiendo invalidación."
  echo "   Ejecuta primero: sam deploy"
fi

# Recuperar URL pública para imprimir al final
URL=$(aws cloudformation describe-stacks \
  --stack-name acacia-catalog \
  --query "Stacks[0].Outputs[?OutputKey=='AdminCloudFrontURL'].OutputValue" \
  --output text --region "$REGION" 2>/dev/null || echo "")

echo ""
if [ -n "$URL" ]; then
  echo "✓ Deploy admin completo → ${URL}"
else
  echo "✓ Deploy admin completo (URL pendiente, revisa outputs de SAM)"
fi
