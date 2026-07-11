# Deploy BQ Viewer Frontend ke Coolify

> Dokumentasi deploy lengkap ada di repo backend:  
> `be-bq-viewer/docs/coolify-deployment.md`

## Environment Variables (Frontend Only)

| Variable       | Wajib | Deskripsi               | Default   |
| -------------- | ----- | ----------------------- | --------- |
| `NGINX_PORT`   | ❌    | Port Nginx              | `80`      |
| `BACKEND_HOST` | ✅    | Hostname/IP backend API | `backend` |
| `BACKEND_PORT` | ❌    | Port backend API        | `5000`    |

## Deploy Terpisah di Coolify

1. **New Resource** → **Public Repository**
2. Pilih: `maulananizhar/fe-bq-viewer`
3. **Build Pack**: `Dockerfile`
4. **Port**: `80`
5. Set `BACKEND_HOST` ke internal domain backend (contoh: `be-bq-viewer.abcd1234.coolify.internal`)
6. Deploy

## Catatan

- Frontend adalah SPA statis yang di-serve Nginx
- Semua request `/api/` diproxy ke `BACKEND_HOST:BACKEND_PORT`
- Pastikan backend sudah deploy dan reachable dari frontend
