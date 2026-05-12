# Acacia Catalog — Backend

Backend serverless del catálogo de muebles Acacia.
Stack: Node.js 20 · TypeScript · AWS Lambda · API Gateway · DynamoDB · CloudFront

---

## Requisitos

- AWS CLI configurado (`aws configure`) con permisos de deploy
- AWS SAM CLI instalado (`brew install aws-sam-cli` o [docs](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- Node.js 20+
- Python 3.8+ (para el seed script)

---

## Deploy — Primera vez

```bash
# 1. Instalar dependencias del backend
cd backend && npm install && cd ..

# 2. Compilar TypeScript + empaquetar con SAM
sam build

# 3. Deploy guiado (primera vez — crea el stack en AWS)
sam deploy --guided
# Stack name     : acacia-catalog
# Region         : us-east-1
# Confirm changes: Y
# Allow SAM roles: Y
# Save to samconfig.toml: Y

# 4. Obtener los outputs del stack
aws cloudformation describe-stacks \
  --stack-name acacia-catalog \
  --query "Stacks[0].Outputs" \
  --region us-east-1 \
  --output table

# 5. Cargar productos a DynamoDB
python scripts/seed_dynamodb.py

# 6. Probar el endpoint
curl https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod/products | jq .meta
```

---

## Deploy — Siguientes veces

```bash
cd backend && npm install && cd ..
sam build && sam deploy
```

---

## Prueba local

```bash
# API completa apuntando a DynamoDB real
sam local start-api --env-vars env.json --region us-east-1

# En otra terminal:
curl http://localhost:3000/products | jq .

# Invocar la Lambda directamente
sam local invoke GetProductsFunction \
  --event events/get-products.json \
  --env-vars env.json \
  --region us-east-1
```

---

## Logs

```bash
# Logs en tiempo real
sam logs -n GetProductsFunction --tail --stack-name acacia-catalog

# Últimos 10 minutos
sam logs -n GetProductsFunction --stack-name acacia-catalog --start-time "10min ago"
```

---

## Estructura

```
acacia-catalog/
├── template.yaml              # SAM — toda la infraestructura AWS
├── samconfig.toml             # Configuración de deploy
├── env.json                   # Variables locales (NO commitear)
├── events/
│   └── get-products.json      # Evento de prueba para sam local invoke
├── backend/
│   ├── src/
│   │   ├── handlers/
│   │   │   └── getProducts.ts     # GET /products
│   │   ├── lib/
│   │   │   └── dynamo.ts          # Cliente DynamoDB + helpers
│   │   └── types/
│   │       └── product.ts         # Interfaces TypeScript
│   ├── package.json
│   └── tsconfig.json
└── scripts/
    └── seed_dynamodb.py           # Carga productos con AWS CLI
```

---

## Endpoints

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/products` | Productos activos agrupados por familia |

### Response exitoso

```json
{
  "ok": true,
  "data": {
    "Muebles TV":     [ { "id": "ACA-TV-001", "name": "VORDEN", ... } ],
    "Mesas de Centro":[ { "id": "ACA-MCT-001", "name": "FOLSW",  ... } ]
  },
  "meta": {
    "total": 14,
    "categorias": 5,
    "generadoEn": "2026-05-08T12:00:00.000Z"
  }
}
```

### Response de error

```json
{
  "ok": false,
  "error": {
    "code": "DYNAMO_SCAN_ERROR",
    "message": "No se pudo obtener el catálogo. Intenta de nuevo.",
    "requestId": "abc-123"
  }
}
```
