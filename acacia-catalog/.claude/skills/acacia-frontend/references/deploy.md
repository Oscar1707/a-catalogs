# Deploy — Acacia Frontend

Workflow completo de build + S3 + CloudFront invalidación.

---

## Recursos AWS

| Recurso | Valor |
|---|---|
| Bucket SPA | `acacia-catalog-spa` |
| Bucket Images | `acacia-catalog-images` |
| CloudFront ID | `E38C3UTB2ISSEA` |
| URL pública | https://d2pgrgppb9pktx.cloudfront.net |
| Región | `us-east-1` |
| Stack SAM padre | `acacia-catalog` |

Estos recursos los **crea y mantiene SAM** (template en `acacia-catalog/template.yaml`).
**No** crear ni eliminar manualmente — coordinar con `acacia-catalog-aws`.

---

## Script de Deploy

`frontend/scripts/deploy.sh` hace tres cosas en secuencia:

1. `npm run build` → genera `dist/`
2. `aws s3 sync dist/ s3://acacia-catalog-spa --delete` con cache headers
3. `aws cloudfront create-invalidation --paths "/*"`

Ejecutar:
```bash
npm run deploy
# o
bash scripts/deploy.sh
```

---

## Cache Headers (críticos)

### Assets (`/assets/*`)
- `Cache-Control: public, max-age=31536000, immutable`
- Vite genera nombres con hash (`index-AbC123.js`), por eso 1 año + immutable
- Cada build cambia el hash → CloudFront sirve el nuevo automáticamente

### `index.html`
- `Cache-Control: public, max-age=0, must-revalidate`
- Siempre fresco → siempre referencia los assets correctos
- Por eso el script lo sube **por separado** con su header propio

### Imágenes en `acacia-catalog-images`
- Manejado por la configuración del bucket / CloudFront, no por este deploy
- Subir con `aws s3 cp ... --cache-control "public, max-age=31536000"`

---

## Invalidación

```bash
aws cloudfront create-invalidation \
  --distribution-id E38C3UTB2ISSEA \
  --paths "/*"
```

**Reglas:**
- Invalidar `/*` en cada deploy — barato (1000 invalidaciones gratis/mes)
- Si necesitas urgencia: invalidar solo `/index.html` (más rápido)
- La invalidación tarda 1-3 minutos en propagarse globalmente

---

## CloudFront Behaviors

Configurados en `template.yaml`:

| Path Pattern | Origin | Cache |
|---|---|---|
| `/api/*` | API Gateway | `Managed-CachingDisabled` |
| Default (`/*`) | S3 SPA | `Managed-CachingOptimized` |

**Routing SPA:**
- 403 → `/index.html` con status 200
- 404 → `/index.html` con status 200
- Esto habilita rutas client-side de React Router

---

## Validar el Deploy

Después del deploy, validar en este orden:

```bash
# 1. El archivo HTML está actualizado
curl -sI https://d2pgrgppb9pktx.cloudfront.net/ | grep last-modified

# 2. El bundle JS responde con el hash nuevo
curl -s https://d2pgrgppb9pktx.cloudfront.net/ | grep -oE 'index-[A-Za-z0-9]+\.js'

# 3. La página carga sin errores
curl -s https://d2pgrgppb9pktx.cloudfront.net/ | grep -i "<div id=\"root\""

# 4. La API responde
curl -s https://y0uumgj0b4.execute-api.us-east-1.amazonaws.com/prod/products | jq '.ok'
```

---

## Troubleshooting

### "Access Denied" al cargar la página
- El bucket es privado, debe servirse vía CloudFront OAC
- Verificar `SpaBucketPolicy` en `template.yaml` — debe permitir `cloudfront.amazonaws.com` para `${SpaBucket.Arn}/*`

### Cambios no aparecen después del deploy
- Hard refresh (Cmd+Shift+R)
- Verificar invalidación: `aws cloudfront list-invalidations --distribution-id E38C3UTB2ISSEA`
- Si la invalidación está en `Completed` y aún no aparece: revisar service worker (no debería haber)

### `npm run build` falla con error de tipo
- Correr `tsc -b --noEmit` para ver el error completo
- Verificar que los tipos en `frontend/src/types/` matcheen con `backend/src/types/`
- Si agregaste un campo opcional: marcar con `?` en ambos lados

### El CSS no aplica los tokens (`bg-ink` no funciona)
- Verificar que `globals.css` está importado en `main.tsx`
- Verificar que el plugin `@tailwindcss/vite` está activo en `vite.config.ts`
- Reiniciar dev server: Tailwind v4 no detecta cambios al `@theme` sin restart

---

## Rollback

Si un deploy rompe el sitio:

```bash
# 1. Identificar la versión anterior
aws s3 ls s3://acacia-catalog-spa/ --recursive | sort -k1,2 -r | head -20

# 2. Restaurar localmente desde git
git checkout <commit-anterior>
npm install
npm run deploy
```

**Mejor:** mantener `dist/` del último deploy estable en local como backup rápido.

---

## CI/CD (Futuro)

No hay pipeline aún. Cuando se agregue (GitHub Actions / CodePipeline):
- Trigger: push a `main` que toque `frontend/**`
- Build en ambiente limpio (Node 20)
- Deploy con rol IAM dedicado (no las credenciales de Oscar)
- Notificación a Slack/email si falla

Por ahora: deploy manual desde local.
