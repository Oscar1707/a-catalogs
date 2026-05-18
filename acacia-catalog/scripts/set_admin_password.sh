#!/usr/bin/env bash
# Inicializa el password admin y el JWT secret en SSM Parameter Store.
# Idempotente — si los parámetros ya existen, los sobreescribe.

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PASSWORD_PARAM="/acacia/admin/password-hash"
JWT_PARAM="/acacia/admin/jwt-secret"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "── Acacia · Configurar credenciales admin ──"
echo ""

# 1. Pedir password (silencioso) y confirmar
read -r -s -p "Password admin (mín. 8 caracteres): " PASSWORD
echo ""
read -r -s -p "Confirmar password: " PASSWORD_CONFIRM
echo ""

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
  echo "✗ Los passwords no coinciden." >&2
  exit 1
fi

if [ ${#PASSWORD} -lt 8 ]; then
  echo "✗ Password muy corto (mínimo 8 caracteres)." >&2
  exit 1
fi

# 2. Generar hash con el lib del backend (scrypt nativo de Node)
echo "→ Generando hash scrypt..."
HASH=$(node --experimental-default-type=module -e "
import('./backend/src/lib/auth.ts').catch(() => null).then(() => {
  // fallback si TS no se puede importar directo
});
const { randomBytes, scryptSync } = require('node:crypto');
const password = process.env.PWD_IN;
const salt = randomBytes(16);
const derived = scryptSync(password, salt, 64);
console.log('scrypt\$' + salt.toString('hex') + '\$' + derived.toString('hex'));
" PWD_IN="$PASSWORD" 2>/dev/null) || true

# Fallback simple si la importación de TS no funciona en el inline
if [ -z "$HASH" ]; then
  HASH=$(PWD_IN="$PASSWORD" node -e "
    const { randomBytes, scryptSync } = require('node:crypto');
    const salt = randomBytes(16);
    const derived = scryptSync(process.env.PWD_IN, salt, 64);
    console.log('scrypt\$' + salt.toString('hex') + '\$' + derived.toString('hex'));
  ")
fi

# 3. Generar JWT secret aleatorio (64 bytes base64)
echo "→ Generando JWT secret..."
JWT_SECRET=$(node -e "console.log(require('node:crypto').randomBytes(64).toString('base64'))")

# 4. Guardar en SSM
echo "→ Guardando en SSM Parameter Store ($REGION)..."
aws ssm put-parameter \
  --name "$PASSWORD_PARAM" \
  --type SecureString \
  --value "$HASH" \
  --overwrite \
  --region "$REGION" \
  --no-cli-pager > /dev/null

aws ssm put-parameter \
  --name "$JWT_PARAM" \
  --type SecureString \
  --value "$JWT_SECRET" \
  --overwrite \
  --region "$REGION" \
  --no-cli-pager > /dev/null

echo ""
echo "✓ Credenciales admin configuradas:"
echo "   $PASSWORD_PARAM"
echo "   $JWT_PARAM"
echo ""
echo "→ Ya puedes hacer login en https://d2pgrgppb9pktx.cloudfront.net/admin/login"

# Limpiar variables sensibles del entorno
unset PASSWORD PASSWORD_CONFIRM HASH JWT_SECRET
