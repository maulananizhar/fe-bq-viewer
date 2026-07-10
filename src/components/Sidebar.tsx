import { useState, useEffect, useCallback, useRef } from 'react'
import type { Connection, DatasetInfo, TableInfo, QueryHistoryItem } from '../types'

// Reusable dropdown menu for three-dot actions
function DropdownMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <div onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}>
        {trigger}
      </div>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

interface SidebarProps {
  history: QueryHistoryItem[]
  onSelectQuery: (query: string) => void
  onDeleteHistory: (id: string) => void
  connections: Connection[]
  activeConnectionId: string | null
  onSelectConnection: (id: string) => void
  onAddConnection: () => void
  onEditConnection: (conn: Connection) => void
  onDeleteConnection: (id: string) => void
  onInsertQuery: (tableName: string, datasetId: string, tableId: string) => void
  onTablesLoaded: (datasetId: string, tables: TableInfo[], projectId: string) => void
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function Sidebar({
  history,
  onSelectQuery,
  onDeleteHistory,
  connections,
  activeConnectionId,
  onSelectConnection,
  onAddConnection,
  onEditConnection,
  onDeleteConnection,
  onInsertQuery,
  onTablesLoaded,
}: SidebarProps) {
  // Dataset browser state
  const [datasets, setDatasets] = useState<DatasetInfo[]>([])
  const [datasetsLoading, setDatasetsLoading] = useState(false)
  const [datasetsError, setDatasetsError] = useState<string | null>(null)
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set())
  const [datasetTables, setDatasetTables] = useState<Record<string, TableInfo[]>>({})
  const [loadingTables, setLoadingTables] = useState<Record<string, boolean>>({})

  // Hidden datasets & tables state (persisted in localStorage)
  const [hiddenDatasets, setHiddenDatasets] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('bq-hidden-datasets')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [hiddenTables, setHiddenTables] = useState<Record<string, Set<string>>>(() => {
    try {
      const saved = localStorage.getItem('bq-hidden-tables')
      if (saved) {
        const obj = JSON.parse(saved) as Record<string, string[]>
        const result: Record<string, Set<string>> = {}
        for (const [k, v] of Object.entries(obj)) result[k] = new Set(v)
        return result
      }
    } catch { /* ignore */ }
    return {}
  })

  const toggleHideDataset = useCallback((datasetId: string) => {
    setHiddenDatasets((prev) => {
      const next = new Set(prev)
      if (next.has(datasetId)) next.delete(datasetId)
      else next.add(datasetId)
      localStorage.setItem('bq-hidden-datasets', JSON.stringify([...next]))
      return next
    })
  }, [])

  const toggleHideTable = useCallback((datasetId: string, tableId: string) => {
    setHiddenTables((prev) => {
      const next = { ...prev }
      if (!next[datasetId]) next[datasetId] = new Set()
      else next[datasetId] = new Set(next[datasetId])
      if (next[datasetId].has(tableId)) next[datasetId].delete(tableId)
      else next[datasetId].add(tableId)
      localStorage.setItem('bq-hidden-tables', JSON.stringify(
        Object.fromEntries(Object.entries(next).map(([k, v]) => [k, [...v]]))
      ))
      return next
    })
  }, [])

  // Adjustable divider state
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [topRatio, setTopRatio] = useState(() => {
    const saved = localStorage.getItem('sidebar-top-ratio')
    return saved ? parseFloat(saved) : 0.6
  })
  const [isDragging, setIsDragging] = useState(false)

  const activeConn = connections.find((c) => c.id === activeConnectionId)

  // Fetch datasets when active connection changes
  useEffect(() => {
    if (!activeConnectionId) {
      setDatasets([])
      setExpandedDatasets(new Set())
      setDatasetTables({})
      return
    }

    setDatasetsLoading(true)
    setDatasetsError(null)
    setExpandedDatasets(new Set())
    setDatasetTables({})

    fetch(`/api/discovery/${activeConnectionId}/datasets`)
      .then((res) => res.json())
      .then((data) => {
        setDatasets(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setDatasetsError('Failed to load datasets')
        setDatasets([])
      })
      .finally(() => setDatasetsLoading(false))
  }, [activeConnectionId])

  const toggleDataset = useCallback(
    async (datasetId: string) => {
      if (expandedDatasets.has(datasetId)) {
        setExpandedDatasets((prev) => {
          const next = new Set(prev)
          next.delete(datasetId)
          return next
        })
        return
      }

      setExpandedDatasets((prev) => new Set(prev).add(datasetId))
      if (datasetTables[datasetId]) return

      setLoadingTables((prev) => ({ ...prev, [datasetId]: true }))
      try {
        const res = await fetch(
          `/api/discovery/${activeConnectionId}/datasets/${encodeURIComponent(datasetId)}/tables`,
        )
        const data = await res.json()
        const tables = Array.isArray(data) ? data : []
        setDatasetTables((prev) => ({ ...prev, [datasetId]: tables }))
        if (activeConn && tables.length > 0) {
          onTablesLoaded(datasetId, tables, activeConn.project_id)
        }
      } catch {
        setDatasetTables((prev) => ({ ...prev, [datasetId]: [] }))
      } finally {
        setLoadingTables((prev) => ({ ...prev, [datasetId]: false }))
      }
    },
    [activeConnectionId, expandedDatasets, datasetTables, activeConn, onTablesLoaded],
  )

  // ---- Draggable divider ----
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const rect = sidebarRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const ratio = Math.max(0.2, Math.min(0.8, y / rect.height))
      setTopRatio(ratio)
      localStorage.setItem('sidebar-top-ratio', String(ratio))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <>
      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        className={`bg-white border-r border-gray-200 flex flex-col overflow-hidden w-72 ${
          isDragging ? 'select-none' : ''
        }`}
      >
        {/* Top section: Connections + Browser */}
        <div
          className="overflow-y-auto border-b border-gray-200"
          style={{ flex: `${topRatio} 1 0%` }}
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Connections
            </h2>
            <button
              onClick={onAddConnection}
              className="text-gray-400 hover:text-[#1a73e8] p-1 rounded transition-colors"
              title="Add connection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {connections.length === 0 ? (
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-400 italic">No connections yet</p>
            </div>
          ) : (
            <div className="pb-2">
              {connections.map((conn) => (
                <div key={conn.id}>
                  {/* Connection item */}
                  <div
                    className={`group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors ${
                      activeConnectionId === conn.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    style={
                      activeConnectionId === conn.id
                        ? { borderLeft: '3px solid #1a73e8' }
                        : { borderLeft: '3px solid transparent' }
                    }
                    onClick={() => onSelectConnection(conn.id)}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 40 40" fill="none">
                      <rect width="40" height="40" rx="6" fill="#9CA3AF" />
                      <circle cx="19" cy="19" r="12" fill="white" />
                      <circle cx="19" cy="19" r="10" fill="#9CA3AF" />
                      <rect x="13" y="16" width="3" height="7" rx="1" fill="white" />
                      <rect x="18" y="12" width="3" height="11" rx="1" fill="white" />
                      <rect x="23" y="18" width="3" height="5" rx="1" fill="white" />
                      <path d="M27 27L34 34" stroke="white" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{conn.name}</p>
                      <p className="text-xs text-gray-400 truncate">{conn.project_id}</p>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditConnection(conn) }}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteConnection(conn.id) }}
                        className="text-gray-400 hover:text-red-500 p-0.5"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Dataset browser for active connection */}
                  {activeConnectionId === conn.id && (
                    <div className="bg-gray-50/50 border-t border-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 40 40" fill="none">
                            <rect width="40" height="40" rx="6" fill="#9CA3AF" />
                            <circle cx="19" cy="19" r="12" fill="white" />
                            <circle cx="19" cy="19" r="10" fill="#9CA3AF" />
                            <rect x="13" y="16" width="3" height="7" rx="1" fill="white" />
                            <rect x="18" y="12" width="3" height="11" rx="1" fill="white" />
                            <rect x="23" y="18" width="3" height="5" rx="1" fill="white" />
                            <path d="M27 27L34 34" stroke="white" strokeWidth="4" strokeLinecap="round" />
                          </svg>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Browser</span>
                        </div>
                        <DropdownMenu
                          trigger={
                            <button className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors" title="Browser options">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                              </svg>
                            </button>
                          }
                        >
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase">Show / Hide Datasets</div>
                          {datasets.map((ds) => (
                            <DropdownItem key={ds.id} onClick={() => toggleHideDataset(ds.id)}>
                              <svg className={`w-3 h-3 shrink-0 ${hiddenDatasets.has(ds.id) ? 'text-gray-300' : 'text-amber-500'}`} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                              <span className={`flex-1 truncate ${hiddenDatasets.has(ds.id) ? 'line-through text-gray-400' : ''}`}>{ds.id}</span>
                              {hiddenDatasets.has(ds.id) && (
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </DropdownItem>
                          ))}
                          {hiddenDatasets.size > 0 && (
                            <>
                              <div className="border-t border-gray-100 my-1" />
                              <DropdownItem onClick={() => { setHiddenDatasets(new Set()); localStorage.removeItem('bq-hidden-datasets') }}>
                                <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Show All
                              </DropdownItem>
                            </>
                          )}
                        </DropdownMenu>
                      </div>

                      <div className="pb-2">
                        {datasetsLoading ? (
                          <div className="flex items-center gap-2 px-6 py-2">
                            <svg className="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-xs text-gray-400">Loading datasets...</span>
                          </div>
                        ) : datasetsError ? (
                          <div className="px-6 py-2">
                            <p className="text-xs text-red-500">{datasetsError}</p>
                          </div>
                        ) : datasets.length === 0 ? (
                          <div className="px-6 py-2">
                            <p className="text-xs text-gray-400 italic">No datasets found</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {datasets
                              .filter((ds) => !hiddenDatasets.has(ds.id))
                              .map((ds) => (
                              <div key={ds.id}>
                                <button
                                  onClick={() => toggleDataset(ds.id)}
                                  className="w-full flex items-center gap-1.5 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors group/dataset"
                                  style={{ paddingLeft: '12px' }}
                                >
                                  <svg
                                    className={`w-3 h-3 text-gray-400 transition-transform ${expandedDatasets.has(ds.id) ? 'rotate-90' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <svg className="w-3.5 h-3.5 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  <span className="truncate flex-1 text-left">{ds.id}</span>
                                  <span className="text-[10px] text-gray-400" onClick={(e) => e.stopPropagation()}>
                                  {loadingTables[ds.id] && (
                                    <svg className="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  )}
                                  <DropdownMenu
                                    trigger={
                                      <button className="text-gray-400 hover:text-gray-600 p-0.5 rounded opacity-0 group-hover/dataset:opacity-100 transition-opacity" title="Dataset options">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                                        </svg>
                                      </button>
                                    }
                                  >
                                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase">Show / Hide Tables</div>
                                    {datasetTables[ds.id]?.map((tbl) => (
                                      <DropdownItem key={tbl.id} onClick={() => toggleHideTable(ds.id, tbl.id)}>
                                        <svg className={`w-3 h-3 shrink-0 ${hiddenTables[ds.id]?.has(tbl.id) ? 'text-gray-300' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h16v3M9 20h6M12 4v16" />
                                        </svg>
                                        <span className={`flex-1 truncate ${hiddenTables[ds.id]?.has(tbl.id) ? 'line-through text-gray-400' : ''}`}>{tbl.name}</span>
                                        {hiddenTables[ds.id]?.has(tbl.id) && (
                                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        )}
                                      </DropdownItem>
                                    ))}
                                    {hiddenTables[ds.id]?.size > 0 && (
                                      <>
                                        <div className="border-t border-gray-100 my-1" />
                                        <DropdownItem onClick={() => {
                                          setHiddenTables((prev) => {
                                            const next = { ...prev }
                                            delete next[ds.id]
                                            localStorage.setItem('bq-hidden-tables', JSON.stringify(
                                              Object.fromEntries(Object.entries(next).map(([k, v]) => [k, [...v]]))
                                            ))
                                            return next
                                          })
                                        }}>
                                          <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          Show All Tables
                                        </DropdownItem>
                                      </>
                                    )}
                                  </DropdownMenu>
                                </span>
                                </button>

                                {expandedDatasets.has(ds.id) && datasetTables[ds.id] && (
                                  <div>
                                    {datasetTables[ds.id].filter((tbl) => !hiddenTables[ds.id]?.has(tbl.id)).length === 0 ? (
                                      <p className="text-xs text-gray-400 italic px-8 py-1">No tables</p>
                                    ) : (
                                      datasetTables[ds.id]
                                        .filter((tbl) => !hiddenTables[ds.id]?.has(tbl.id))
                                        .map((tbl) => (
                                        <button
                                          key={tbl.id}
                                          onClick={() => {
                                            const fullName = `\`${conn.project_id}.${ds.id}.${tbl.name}\``
                                            onInsertQuery(fullName, ds.id, tbl.id)
                                          }}
                                          className="w-full flex items-center gap-1.5 px-4 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                                          style={{ paddingLeft: '32px' }}
                                          title={`Insert SELECT * FROM ${conn.project_id}.${ds.id}.${tbl.name} LIMIT 100`}
                                        >
                                          <svg className="w-3.5 h-3.5 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h16v3M9 20h6M12 4v16" />
                                          </svg>
                                          <span className="truncate">{tbl.name}</span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Draggable Divider */}
        <div
          className="shrink-0 relative flex items-center justify-center cursor-row-resize hover:bg-blue-100 transition-colors group select-none"
          style={{ height: '6px', minHeight: '6px' }}
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-8 h-0.5 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
        </div>

        {/* Bottom section: Query History */}
        <div className="overflow-y-auto" style={{ flex: `${1 - topRatio} 1 0%` }}>
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Query History
            </h3>
          </div>

          {history.length === 0 ? (
            <div className="p-4 text-xs text-gray-400">Run a query to see history</div>
          ) : (
            <div className="p-2 space-y-0.5">
              {history.map((item) => (
                <div key={item.id} className="group flex items-start gap-1 rounded hover:bg-gray-50 px-2 py-1.5">
                  <button
                    onClick={() => onSelectQuery(item.query)}
                    className="flex-1 text-left min-w-0"
                    title={item.query}
                  >
                    <p className="text-xs text-gray-600 truncate leading-relaxed">
                      {item.query}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatRelativeTime(item.executedAt)}
                    </p>
                  </button>
                  <button
                    onClick={() => onDeleteHistory(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5 shrink-0 transition-opacity"
                    title="Delete"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Sidebar
