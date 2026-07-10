import { useCallback, useRef, useEffect, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { keymap, EditorView } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { formatSqlQuery } from '../utils/sqlFormatter'

interface QueryEditorProps {
  query: string
  onChange: (value: string) => void
  onRun: () => void
  loading: boolean
  schemaMap: Record<string, string[]>
}

const customTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    backgroundColor: 'transparent',
  },
  '&.cm-editor': {
    outline: 'none',
    height: '100%',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: '#1a73e8',
    padding: '8px 0',
  },
  '.cm-cursor': {
    borderLeftColor: '#1a73e8',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#e8f0fe !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-gutters': {
    display: 'none',
  },
})

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'AS', 'ON',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL',
  'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'HAVING', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'DATABASE', 'SCHEMA', 'DROP', 'ALTER', 'TRUNCATE',
  'INDEX', 'VIEW', 'WITH', 'UNION', 'ALL', 'DISTINCT', 'EXCEPT', 'INTERSECT',
  'CAST', 'NULL', 'IS', 'LIKE', 'BETWEEN', 'EXISTS', 'INSTR',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'TRUE', 'FALSE',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'OVER', 'PARTITION', 'ROWS',
  'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW',
  'FETCH', 'NEXT', 'ONLY', 'RECURSIVE', 'QUALIFY',
  'TIMESTAMP', 'DATE', 'STRING', 'INT64', 'FLOAT64', 'NUMERIC', 'BOOL',
  'ARRAY', 'STRUCT', 'JSON', 'BYTES', 'INTERVAL', 'GEOGRAPHY',
]

// Extract table names referenced in the current query (FROM / JOIN / INTO / UPDATE)
function getReferencedTables(query: string): Set<string> {
  const refs = new Set<string>()
  // Handle both backtick-quoted identifiers (which can contain hyphens, dots, etc.)
  // and plain unquoted identifiers (alphanumeric, underscores, dots)
  const tablePattern = /(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?:`([^`]+)`|([\w.-]+))/gi
  let match: RegExpExecArray | null
  while ((match = tablePattern.exec(query)) !== null) {
    const name = (match[1] || match[2]).replace(/[`'"]/g, '')
    refs.add(name)
    // Also add short name (last segment after dot)
    const dotIdx = name.lastIndexOf('.')
    if (dotIdx > 0) {
      refs.add(name.slice(dotIdx + 1))
    }
  }
  return refs
}

// Find which schemaMap keys match a given table reference
function resolveSchemaKeys(tableRef: string, schemaMap: Record<string, string[]>): string[] {
  const normalized = tableRef.toLowerCase()
  const keys: string[] = []
  for (const key of Object.keys(schemaMap)) {
    // Try exact match, suffix match (short name), and the full path match
    const keyLower = key.toLowerCase()
    if (keyLower === normalized) {
      keys.push(key)
    } else {
      const shortKey = keyLower.includes('.') ? keyLower.slice(keyLower.lastIndexOf('.') + 1) : ''
      if (shortKey === normalized) {
        keys.push(key)
      }
    }
  }
  return keys
}

// Combined completion source: SQL keywords + table names + context-aware column names
function combinedCompletionSource(schemaMap: Record<string, string[]>): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/[\w`."]+/)
    if (!word && !context.explicit) return null

    // Get full query to find referenced tables
    const fullQuery = context.state.doc.toString()
    const referencedTables = getReferencedTables(fullQuery)

    // Resolve schema keys for all referenced tables
    const resolvedTableKeys = new Set<string>()
    for (const ref of referencedTables) {
      const keys = resolveSchemaKeys(ref, schemaMap)
      for (const k of keys) resolvedTableKeys.add(k)
    }

    const options = []
    const prefix = word ? word.text.toLowerCase() : ''

    // SQL keywords (uppercase is standard)
    for (const kw of SQL_KEYWORDS) {
      if (!prefix || kw.toLowerCase().startsWith(prefix)) {
        options.push({ label: kw, type: 'keyword', boost: -2 })
      }
    }

    // Table names — always show all tables for discovery
    const addedTables = new Set<string>()
    for (const [table, _columns] of Object.entries(schemaMap)) {
      if (!prefix || table.toLowerCase().startsWith(prefix)) {
        if (!addedTables.has(table)) {
          options.push({ label: table, type: 'type', detail: 'table', boost: -1 })
          addedTables.add(table)
        }
      }

      // Short name (without dataset prefix)
      const dotIdx = table.indexOf('.')
      if (dotIdx > 0) {
        const shortName = table.slice(dotIdx + 1)
        if (!prefix || shortName.toLowerCase().startsWith(prefix)) {
          if (!addedTables.has(shortName)) {
            options.push({ label: shortName, type: 'type', detail: 'table', boost: -1 })
            addedTables.add(shortName)
          }
        }
      }
    }

    // Column names — ONLY from referenced tables
    // If no tables are referenced yet, show no columns (avoid noise)
    const tablesToShowColumns = resolvedTableKeys.size > 0
      ? resolvedTableKeys
      : new Set<string>()

    for (const tableKey of tablesToShowColumns) {
      const columns = schemaMap[tableKey]
      if (!columns) continue
      for (const col of columns) {
        if (!prefix || col.toLowerCase().includes(prefix)) {
          options.push({ label: col, type: 'property', detail: 'column' })
        }
      }
    }

    return {
      from: word ? word.from : context.pos,
      options,
      validFor: /^[\w`."]+$/,
    }
  }
}

function QueryEditor({ query, onChange, onRun, loading, schemaMap }: QueryEditorProps) {
  const onRunRef = useRef(onRun)

  useEffect(() => {
    onRunRef.current = onRun
  }, [onRun])

  const handleChange = useCallback(
    (value: string) => {
      onChange(value)
    },
    [onChange],
  )

  // SQL extension: syntax highlighting only (no built-in schema to avoid casing issues)
  const sqlExt = useMemo(() => sql(), [])

  // Custom completion: keywords + schema items with original casing
  const completionExt = useMemo(
    () => autocompletion({
      override: [combinedCompletionSource(schemaMap)],
      maxRenderedOptions: 50,
      defaultKeymap: true,
      closeOnBlur: false,
    }),
    [schemaMap],
  )

  const handleFormat = useCallback(() => {
    const formatted = formatSqlQuery(query)
    onChange(formatted)
  }, [query, onChange])

  const runKeymap = useMemo(
    () =>
      Prec.high(
        keymap.of([
          {
            key: 'Ctrl-Enter',
            mac: 'Cmd-Enter',
            run: () => {
              onRunRef.current()
              return true
            },
          },
        ]),
      ),
    [],
  )

  const formatKeymap = useMemo(
    () =>
      Prec.high(
        keymap.of([
          {
            key: 'Ctrl-Shift-p',
            mac: 'Cmd-Shift-p',
            run: () => {
              handleFormat()
              return true
            },
          },
        ]),
      ),
    [handleFormat],
  )

  return (
    <div className="h-full flex flex-col bg-white border-b border-gray-200 shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            SQL Query
          </span>
          {loading && (
            <span className="text-xs text-blue-500 animate-pulse">● Running...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">
            Ctrl/Cmd + ⏎ Run | Ctrl+Shift+P Format
          </span>
          <button
            onClick={handleFormat}
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Format SQL (Ctrl+Shift+P)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
            </svg>
            Format
          </button>
          <button
            onClick={onRun}
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#1a73e8] text-white text-sm font-medium rounded hover:bg-[#1557b0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 px-4 py-2 overflow-hidden">
        <CodeMirror
          value={query}
          onChange={handleChange}
          extensions={[sqlExt, completionExt, runKeymap, formatKeymap, customTheme]}
          placeholder="Enter SQL query here... e.g. SELECT * FROM `project.dataset.table` LIMIT 100"
          height="100%"
          minHeight="80px"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            highlightActiveLine: false,
            highlightSelectionMatches: true,
            syntaxHighlighting: true,
          }}
        />
      </div>
    </div>
  )
}

export default QueryEditor
