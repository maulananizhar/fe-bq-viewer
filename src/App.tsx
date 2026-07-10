import { useState, useCallback, useEffect, useRef } from 'react'
import QueryEditor from './components/QueryEditor'
import ResultsTable from './components/ResultsTable'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ConnectionModal from './components/ConnectionModal'
import ConfirmDialog from './components/ConfirmDialog'
import { checkQuerySafety } from './utils/safeQuery'
import type { Connection, ConnectionFormData, TableInfo, ColumnInfo, QueryHistoryItem } from './types'

interface QueryResult {
  data: Record<string, unknown>[]
  totalRows: number
  totalCount?: number
  error?: string
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [history, setHistory] = useState<QueryHistoryItem[]>([])

  // Connection state
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null)

  // Schema cache for autocompletion
  const [schemaCache, setSchemaCache] = useState<Record<string, string[]>>({})

  // Adjustable divider between editor and results
  const mainRef = useRef<HTMLDivElement>(null)
  const [editorRatio, setEditorRatio] = useState(() => {
    const saved = localStorage.getItem('main-editor-ratio')
    return saved ? parseFloat(saved) : 0.4
  })
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)

  // Safe-query confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    severity: 'info' | 'warning' | 'danger'
  }>({ open: false, title: '', message: '', severity: 'info' })

  // Fetch connections on mount
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections')
      const data = await res.json()
      setConnections(data)
      if (data.length > 0) {
        setActiveConnectionId((prev) => prev || data[0].id)
      }
    } catch {
      // server not ready yet
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const activeConnection = connections.find((c) => c.id === activeConnectionId) || null

  // Fetch query history when connection changes
  const fetchHistory = useCallback(async (connectionId: string) => {
    try {
      const res = await fetch(`/api/query-history/${connectionId}`)
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    if (activeConnectionId) {
      fetchHistory(activeConnectionId)
    } else {
      setHistory([])
    }
  }, [activeConnectionId, fetchHistory])

  // Fetch columns for tables and build schema cache
  const loadTableColumns = useCallback(
    async (datasetId: string, tables: TableInfo[], projectId: string) => {
      if (!activeConnectionId) return

      const newEntries: Record<string, string[]> = {}

      for (const table of tables) {
        try {
          const res = await fetch(
            `/api/discovery/${activeConnectionId}/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(table.id)}/columns`,
          )
          const columns: ColumnInfo[] = await res.json()
          if (Array.isArray(columns)) {
            const colNames = columns.map((c) => c.name)
            newEntries[table.id] = colNames
            newEntries[`${datasetId}.${table.id}`] = colNames
            newEntries[`${projectId}.${datasetId}.${table.id}`] = colNames
          }
        } catch {
          // skip
        }
      }

      if (Object.keys(newEntries).length > 0) {
        setSchemaCache((prev) => ({ ...prev, ...newEntries }))
      }
    },
    [activeConnectionId],
  )

  // Actual query execution
  const executeQuery = useCallback(async () => {
    if (!query.trim() || !activeConnectionId) return

    setLoading(true)
    setResults(null)
    const startTime = performance.now()

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, connection_id: activeConnectionId }),
      })
      const result = await response.json()
      setResults(result)

      // If successful, refresh history from server (query is auto-saved by backend)
      if (!result.error) {
        fetchHistory(activeConnectionId)
      }
    } catch {
      setResults({ data: [], totalRows: 0, totalCount: 0, error: 'Failed to connect to server' })
    } finally {
      setExecutionTime(performance.now() - startTime)
      setLoading(false)
    }
  }, [query, activeConnectionId, fetchHistory])

  // Run handler with safety check
  const handleRunQuery = useCallback(() => {
    if (!query.trim() || !activeConnectionId) return

    const { safe, warning, severity } = checkQuerySafety(query)

    if (safe) {
      executeQuery()
    } else {
      setConfirmDialog({
        open: true,
        title: 'Confirm Query Execution',
        message: warning || 'This query may modify data.',
        severity,
      })
    }
  }, [query, activeConnectionId, executeQuery])

  const handleConfirmRun = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
    executeQuery()
  }, [executeQuery])

  const handleCancelRun = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
  }, [])

  const handleInsertQuery = useCallback(
    (tableName: string, datasetId: string, tableId: string) => {
      setQuery(`SELECT * FROM ${tableName} LIMIT 100`)
      const conn = connections.find((c) => c.id === activeConnectionId)
      if (conn) {
        loadTableColumns(datasetId, [{ id: tableId, name: tableId, type: 'TABLE' }], conn.project_id)
      }
    },
    [activeConnectionId, connections, loadTableColumns],
  )

  // ---- Draggable divider between editor and results ----
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingDivider(true)
  }, [])

  useEffect(() => {
    if (!isDraggingDivider) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return
      const rect = mainRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const ratio = Math.max(0.1, Math.min(0.8, y / rect.height))
      setEditorRatio(ratio)
      localStorage.setItem('main-editor-ratio', String(ratio))
    }

    const handleMouseUp = () => {
      setIsDraggingDivider(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingDivider])

  // Delete history item
  const handleDeleteHistory = useCallback(async (id: string) => {
    try {
      await fetch(`/api/query-history/${id}`, { method: 'DELETE' })
      setHistory((prev) => prev.filter((h) => h.id !== id))
    } catch {
      // ignore
    }
  }, [])

  // Connection CRUD
  const openNewConnection = () => {
    setEditingConnection(null)
    setModalOpen(true)
  }

  const openEditConnection = (conn: Connection) => {
    setEditingConnection(conn)
    setModalOpen(true)
  }

  const handleSaveConnection = async (data: ConnectionFormData) => {
    try {
      if (editingConnection) {
        await fetch(`/api/connections/${editingConnection.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        const res = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const created = await res.json()
        setActiveConnectionId(created.id)
      }
      setModalOpen(false)
      fetchConnections()
    } catch {
      // handle error
    }
  }

  const handleDeleteConnection = async (id: string) => {
    try {
      await fetch(`/api/connections/${id}`, { method: 'DELETE' })
      if (activeConnectionId === id) {
        setActiveConnectionId(null)
        setSchemaCache({})
      }
      fetchConnections()
    } catch {
      // handle error
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          history={history}
          onSelectQuery={(q) => setQuery(q)}
          connections={connections}
          activeConnectionId={activeConnectionId}
          onSelectConnection={setActiveConnectionId}
          onAddConnection={openNewConnection}
          onEditConnection={openEditConnection}
          onDeleteConnection={handleDeleteConnection}
          onInsertQuery={handleInsertQuery}
          onTablesLoaded={loadTableColumns}
          onDeleteHistory={handleDeleteHistory}
        />
        <main ref={mainRef} className={`flex-1 flex flex-col overflow-hidden ${isDraggingDivider ? 'select-none' : ''}`}>
          {!activeConnection ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="8" fill="#4285F4" />
                  <circle cx="19" cy="19" r="12" fill="white" />
                  <circle cx="19" cy="19" r="10" fill="#4285F4" />
                  <rect x="13" y="16" width="3" height="7" rx="1" fill="white" />
                  <rect x="18" y="12" width="3" height="11" rx="1" fill="white" />
                  <rect x="23" y="18" width="3" height="5" rx="1" fill="white" />
                  <path d="M27 27L34 34" stroke="white" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <h3 className="text-lg font-medium text-gray-500 mb-2">No Connection Selected</h3>
                <p className="text-sm text-gray-400 mb-4">Add a BigQuery connection to start querying</p>
                <button
                  onClick={openNewConnection}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-sm font-medium rounded hover:bg-[#1557b0] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Connection
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="h-full overflow-hidden" style={{ flex: `${editorRatio} 1 0%` }}>
                <QueryEditor
                  query={query}
                  onChange={setQuery}
                  onRun={handleRunQuery}
                  loading={loading}
                  schemaMap={schemaCache}
                />
              </div>
              {/* Draggable Divider */}
              <div
                className="shrink-0 relative flex items-center justify-center cursor-row-resize hover:bg-blue-100 transition-colors group select-none"
                style={{ height: '6px', minHeight: '6px' }}
                onMouseDown={handleDividerMouseDown}
              >
                <div className="w-8 h-0.5 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
              </div>
              <div className="h-full overflow-hidden" style={{ flex: `${1 - editorRatio} 1 0%` }}>
                <ResultsTable
                  results={results}
                  loading={loading}
                  executionTime={executionTime}
                />
              </div>
            </>
          )}
        </main>
      </div>

      <ConnectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveConnection}
        editConnection={editingConnection}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
        confirmLabel="Run Anyway"
        onConfirm={handleConfirmRun}
        onCancel={handleCancelRun}
      />
    </div>
  )
}

export default App
