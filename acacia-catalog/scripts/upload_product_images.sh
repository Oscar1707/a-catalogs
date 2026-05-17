#!/usr/bin/env bash
# Convierte imágenes JPG/PNG a WebP, las sube a S3 y actualiza DynamoDB.
#
# Uso:
#   ./scripts/upload_product_images.sh <slug> <imagen1> [imagen2] ...
#
# Ejemplo:
#   ./scripts/upload_product_images.sh lumina /Users/me/lumina.png
#
# La primera imagen pasada se vuelve coverImage. Todas se listan en `images[]`.
# Las imágenes ya existentes para ese slug se SOBREESCRIBEN.

set -euo pipefail

SLUG="${1:?Falta el slug del producto}"
shift
if [ $# -eq 0 ]; then
  echo "Error: pasa al menos una imagen como argumento" >&2
  exit 1
fi

BUCKET="acacia-catalog-images"
TABLE="acacia-products"
DIST_ID="E38C3UTB2ISSEA"
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

# Resolver PK desde el slug — necesitamos el id real para construir la PK
# (el id en DynamoDB se guarda lowercased en la PK).
PK=$(aws dynamodb scan --table-name "$TABLE" \
  --filter-expression "slug = :s AND begins_with(PK, :p)" \
  --expression-attribute-values "{\":s\":{\"S\":\"$SLUG\"},\":p\":{\"S\":\"PRODUCT#\"}}" \
  --projection-expression "PK" --output json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['Items'][0]['PK']['S']) if d['Items'] else exit(1)")

if [ -z "$PK" ]; then
  echo "✗ No se encontró ningún producto con slug=$SLUG" >&2
  exit 1
fi
echo "→ Producto encontrado: $PK"

# ── Conversión + upload ──
URLS=()
i=1
for src in "$@"; do
  if [ ! -f "$src" ]; then
    echo "✗ No existe: $src" >&2
    exit 1
  fi

  num=$(printf "%02d" "$i")
  out="$TMP/${num}.webp"

  echo "→ [$num] $(basename "$src")"
  # -q 82: calidad alta (sweet spot tamaño/calidad)
  # -resize 1600 0: ancho máx 1600, alto proporcional (no agranda si ya es menor)
  # -mt: multi-thread
  cwebp -q 82 -resize 1600 0 -mt "$src" -o "$out" 2>&1 | tail -1

  s3_key="${SLUG}/${num}.webp"
  url="https://${BUCKET}.s3.amazonaws.com/${s3_key}"

  aws s3 cp "$out" "s3://${BUCKET}/${s3_key}" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "image/webp" \
    --no-progress

  URLS+=("$url")
  i=$((i + 1))
done

# ── Actualizar DynamoDB ──
echo "→ Actualizando DynamoDB"
COVER="${URLS[0]}"

# Construir JSON del array images
IMAGES_JSON=$(python3 -c "
import json, sys
urls = ${URLS[@]@Q}.split()  # no-op, ya viene como array bash
" 2>/dev/null || python3 -c "
import json
urls = [$(printf '\"%s\",' "${URLS[@]}" | sed 's/,$//')]
print(json.dumps([{'S': u} for u in urls]))
")

NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

aws dynamodb update-item \
  --table-name "$TABLE" \
  --key "{\"PK\":{\"S\":\"$PK\"},\"SK\":{\"S\":\"METADATA\"}}" \
  --update-expression "SET coverImage = :c, images = :i, updatedAt = :u" \
  --expression-attribute-values "{
    \":c\": {\"S\": \"$COVER\"},
    \":i\": {\"L\": $IMAGES_JSON},
    \":u\": {\"S\": \"$NOW\"}
  }" \
  --output json > /dev/null

echo "✓ DynamoDB actualizado · cover=$COVER · ${#URLS[@]} imagen(es)"
