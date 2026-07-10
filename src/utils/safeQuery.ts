export interface SafeCheckResult {
  safe: boolean;
  warning: string | null;
  severity: 'info' | 'warning' | 'danger';
}

export function checkQuerySafety(query: string): SafeCheckResult {
  const trimmed = query.trim().toUpperCase();

  // Safe read operations
  if (/^(SELECT|EXPLAIN|SHOW|WITH|DESCRIBE)\b/.test(trimmed)) {
    return { safe: true, warning: null, severity: 'info' };
  }

  // Dangerous operations
  if (/^DROP\b/.test(trimmed)) {
    return {
      safe: false,
      warning: 'This query will DROP (permanently delete) database objects.',
      severity: 'danger',
    };
  }

  if (/^TRUNCATE\b/.test(trimmed)) {
    return {
      safe: false,
      warning: 'This query will TRUNCATE (delete all rows) from a table.',
      severity: 'danger',
    };
  }

  if (/^DELETE\b/.test(trimmed)) {
    const hasWhere = /\bWHERE\b/.test(trimmed);
    return {
      safe: false,
      warning: hasWhere
        ? 'This will DELETE rows from a table.'
        : '⚠️ WARNING: This will DELETE ALL rows — no WHERE clause detected!',
      severity: hasWhere ? 'warning' : 'danger',
    };
  }

  if (/^ALTER\b/.test(trimmed)) {
    return {
      safe: false,
      warning: 'This query will ALTER a database schema / table structure.',
      severity: 'warning',
    };
  }

  if (/^UPDATE\b/.test(trimmed)) {
    const hasWhere = /\bWHERE\b/.test(trimmed);
    return {
      safe: false,
      warning: hasWhere
        ? 'This will UPDATE rows in a table.'
        : '⚠️ WARNING: This will UPDATE ALL rows — no WHERE clause detected!',
      severity: hasWhere ? 'warning' : 'danger',
    };
  }

  if (/^INSERT\b/.test(trimmed)) {
    return {
      safe: false,
      warning: 'This query will INSERT new data into a table.',
      severity: 'warning',
    };
  }

  if (/^CREATE\b/.test(trimmed)) {
    if (/\bOR\s+REPLACE\b/.test(trimmed)) {
      return {
        safe: false,
        warning: 'This will CREATE OR REPLACE a database object.',
        severity: 'warning',
      };
    }
    return {
      safe: false,
      warning: 'This query will CREATE a new database object.',
      severity: 'info',
    };
  }

  // Catch-all for unknown statement types
  return { safe: true, warning: null, severity: 'info' };
}
