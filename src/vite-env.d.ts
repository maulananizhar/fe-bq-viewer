/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL untuk API backend.
   *
   * - Tanpa proxy: set ke full URL backend, misal `http://host:5000/api`
   *   (backend harus allow CORS origin frontend).
   * - Dengan proxy: tidak perlu di-set, fallback ke "/api" (via frontend server proxy).
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
