import { useState, useEffect } from 'react'
import type { Connection, ConnectionFormData } from '../types'

interface ConnectionModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: ConnectionFormData) => void
  editConnection?: Connection | null
}

const defaultForm: ConnectionFormData = {
  name: '',
  project_id: '',
  private_key: '',
  private_key_id: '',
  client_email: '',
  client_id: '',
  token_url: 'https://oauth2.googleapis.com/token',
  type: 'service_account',
}

function ConnectionModal({ open, onClose, onSave, editConnection }: ConnectionModalProps) {
  const [form, setForm] = useState<ConnectionFormData>(defaultForm)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (editConnection) {
      setForm({
        name: editConnection.name,
        project_id: editConnection.project_id,
        private_key: editConnection.private_key,
        private_key_id: editConnection.private_key_id,
        client_email: editConnection.client_email,
        client_id: editConnection.client_id,
        token_url: editConnection.token_url,
        type: editConnection.type,
      })
    } else {
      setForm(defaultForm)
    }
  }, [editConnection, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">
            {editConnection ? 'Edit Connection' : 'New Connection'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Connection Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My GCP Project"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Project ID</label>
            <input
              type="text"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              placeholder="my-project-123"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Client Email</label>
            <input
              type="email"
              value={form.client_email}
              onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              placeholder="service-account@project.iam.gserviceaccount.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Client ID</label>
              <input
                type="text"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                placeholder="123456789"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Private Key ID</label>
              <input
                type="text"
                value={form.private_key_id}
                onChange={(e) => setForm({ ...form, private_key_id: e.target.value })}
                placeholder="a1b2c3..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Private Key</label>
            <div className="relative">
              <textarea
                value={form.private_key}
                onChange={(e) => setForm({ ...form, private_key: e.target.value })}
                placeholder="-----BEGIN PRIVATE KEY-----\n..."
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                title={showKey ? 'Hide' : 'Show'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showKey ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Token URL</label>
            <input
              type="text"
              value={form.token_url}
              onChange={(e) => setForm({ ...form, token_url: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded transition-colors"
          >
            {editConnection ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConnectionModal
