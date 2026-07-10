import { useMemo } from 'react'

interface QueryResult {
  data: Record<string, unknown>[]
  totalRows: number
  totalCount?: number
  error?: string
  schema?: any
}

interface ResultsTableProps {
  results: QueryResult | null
  loading: boolean
  executionTime: number | null
}

function ResultsTable({ results, loading, executionTime }: ResultsTableProps) {
  const columns = useMemo(() => {
    if (!results?.data?.length) return []
    return Object.keys(results.data[0])
  }, [results])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-[#1a73e8] mx-auto mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-500">Running query...</p>
        </div>
      </div>
    )
  }

  if (results?.error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-800 mb-1">Query Error</h3>
          <p className="text-sm text-red-600 font-mono bg-red-50 rounded p-3 text-left">{results.error}</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#D1D5DB" />
            <circle cx="19" cy="19" r="12" fill="white" />
            <circle cx="19" cy="19" r="10" fill="#D1D5DB" />
            <rect x="13" y="16" width="3" height="7" rx="1" fill="white" />
            <rect x="18" y="12" width="3" height="11" rx="1" fill="white" />
            <rect x="23" y="18" width="3" height="5" rx="1" fill="white" />
            <path d="M27 27L34 34" stroke="white" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-gray-400">Write a query and click Run</p>
        </div>
      </div>
    )
  }

  if (results.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-sm text-gray-500">Query executed successfully — 0 rows returned</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Status bar */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex items-center gap-4">
        <span>Results</span>
        <span className="text-gray-300">|</span>
        <span>{results.totalRows.toLocaleString()}{results.totalCount != null && results.totalCount !== results.totalRows ? `/${results.totalCount.toLocaleString()}` : ''} rows</span>
        {executionTime !== null && (
          <>
            <span className="text-gray-300">|</span>
            <span>{(executionTime / 1000).toFixed(2)}s</span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 sticky top-0 z-10">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 tracking-wider border-b border-gray-200 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`hover:bg-blue-50 transition-colors ${
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <td className="px-4 py-2.5 text-xs text-gray-400 border-b border-gray-100 whitespace-nowrap">
                  {rowIdx + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2.5 text-sm text-gray-700 border-b border-gray-100 max-w-xs truncate"
                    title={String(row[col] ?? '')}
                  >
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default ResultsTable
