import { format } from 'sql-formatter'

/**
 * Format SQL query using sql-formatter library
 * @param query - Raw SQL query string
 * @returns Formatted SQL query
 */
export function formatSqlQuery(query: string): string {
  if (!query.trim()) {
    return query
  }

  try {
    return format(query, {
      language: 'bigquery',
      tabWidth: 2,
      keywordCase: 'upper',
      dataTypeCase: 'upper',
      functionCase: 'upper',
    })
  } catch {
    // Jika format gagal, return query asli
    return query
  }
}
