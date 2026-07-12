# Deploy BQ Viewer Frontend ke Coolify

> Dokumentasi deploy lengkap ada di repo backend:  
> `be-bq-viewer/docs/coolify-deployment.md`

## Environment Variables (Frontend Only)

| Variable       | Wajib | Deskripsi                                                                | Default   |
| -------------- | ----- | ------------------------------------------------------------------------ | --------- |
| `PORT`         | ❌    | Port frontend server                                                     | `80`      |
| `BACKEND_URL`  | ⚡    | Full URL backend (untuk deployment terpisah). **Prioritas** jika di-set. | —         |
| `BACKEND_HOST` | ✅    | Hostname backend (untuk Docker Compose / internal network).              | `backend` |
| `BACKEND_PORT` | ❌    | Port backend                                                             | `5000`    |

> **`BACKEND_URL` vs `BACKEND_HOST`**
>
> - **`BACKEND_URL`** → untuk deployment terpisah (2 resource Coolify terpisah).  
>   Contoh: `https://api.example.com` atau `http://be-bq-viewer.xyz.coolify.internal:5000`
> - **`BACKEND_HOST` + `BACKEND_PORT`** → untuk Docker Compose (container share network).  
>   Contoh: `BACKEND_HOST=backend`, `BACKEND_PORT=5000`

## Deploy Terpisah di Coolify (2 Resource)

1. **Backend** → deploy `maulananizhar/be-bq-viewer` sebagai resource pertama
2. **Frontend** → deploy `maulananizhar/fe-bq-viewer` sebagai resource kedua
3. Set environment variables frontend:

| Variable      | Nilai                                     |
| ------------- | ----------------------------------------- |
| `BACKEND_URL` | `https://<backend-domain>` (dari Coolify) |

4. Pastikan backend `CORS_ORIGIN` di-set ke domain frontend, e.g. `https://bq-viewer.maulananizhar.my.id`

## Deploy via Docker Compose (1 Resource)

1. **New Resource** → **Docker Compose**
2. Pilih repo `maulananizhar/fe-bq-viewer`
3. Compose File: `docker-compose.coolify.yml`
4. Set environment variables:
   - `DOCKER_USERNAME`, `MONGODB_URI`, `ENCRYPTION_KEY`, `AUTH_PASSWORD`
5. Deploy

## Catatan

- Frontend adalah SPA statis yang di-serve oleh Node.js (Express)
- Semua request `/api/` diproxy ke backend (via `BACKEND_URL` atau `BACKEND_HOST:BACKEND_PORT`)
- Pastikan backend sudah deploy dan reachable dari frontend
- Jika error `"Error occurred while trying to proxy..."` → cek `BACKEND_URL` atau `BACKEND_HOST` sudah benar
