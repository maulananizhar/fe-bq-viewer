export interface Connection {
  id: string
  name: string
  project_id: string
  type: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  token_url: string
  createdAt?: string
  updatedAt?: string
}

export interface ConnectionFormData {
  name: string
  project_id: string
  private_key: string
  private_key_id: string
  client_email: string
  client_id: string
  token_url: string
  type: string
}

export interface DatasetInfo {
  id: string
  name: string
}

export interface ColumnInfo {
  name: string
  type: string
}

export interface QueryHistoryItem {
  id: string
  query: string
  executedAt: string
}

export interface TableInfo {
  id: string
  name: string
  type: string
}
