interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  severity: 'info' | 'warning' | 'danger'
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const severityStyles = {
  info: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50',
    button: 'bg-blue-500 hover:bg-blue-600',
    border: 'border-blue-200',
  },
  warning: {
    icon: 'text-amber-500',
    bg: 'bg-amber-50',
    button: 'bg-amber-500 hover:bg-amber-600',
    border: 'border-amber-200',
  },
  danger: {
    icon: 'text-red-500',
    bg: 'bg-red-50',
    button: 'bg-red-500 hover:bg-red-600',
    border: 'border-red-200',
  },
}

function ConfirmDialog({
  open,
  title,
  message,
  severity,
  confirmLabel = 'Proceed',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const styles = severityStyles[severity]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className={`relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 ${styles.border} border`}>
        <div className="flex items-start gap-4 px-6 pt-6 pb-4">
          <div className={`w-10 h-10 rounded-full ${styles.bg} flex items-center justify-center shrink-0`}>
            {severity === 'danger' ? (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
