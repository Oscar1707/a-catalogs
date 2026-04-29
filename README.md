# a-catalogs

Digital catalog repository for **Acacia** brand.

## 🌐 Live Catalog

The catalog is deployed via GitHub Pages:
👉 **[View Catalog](https://oscar1707.github.io/a-catalogs/)**

## 📂 Structure

```
a-catalogs/
├── acacia_catalogo_v2.html    # Main catalog file
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Pages auto-deploy workflow
└── README.md
```

## 🚀 Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production — deploys to GitHub Pages |
| `dev`  | Development — work in progress |

## 🔄 Deployment

Pushes to `main` automatically trigger a GitHub Pages deployment via GitHub Actions.
To publish updates: work on `dev`, then merge to `main`.
