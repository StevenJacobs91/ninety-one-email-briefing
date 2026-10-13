import { useState } from 'react'
import type { ApprovalRole, ApprovalStageConfig } from '../../types/approval.types'

interface WorkflowAddNodeModalProps {
  initial?: Partial<ApprovalStageConfig>
  onSave: (config: ApprovalStageConfig) => void
  onClose: () => void
  mode: 'add' | 'edit'
}

const ROLE_OPTIONS: { value: ApprovalRole; label: string }[] = [
  { value: 'brand_guardian', label: 'Brand Guardian' },
  { value: 'legal',          label: 'Legal' },
  { value: 'manager',        label: 'Manager' },
  { value: 'reviewer',       label: 'Reviewer' },
]

export function WorkflowAddNodeModal({
  initial,
  onSave,
  onClose,
  mode,
}: WorkflowAddNodeModalProps) {
  const [role, setRole] = useState<ApprovalRole | ''>(initial?.role ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [dueDays, setDueDays] = useState<string>(
    initial?.dueDaysFromRequest != null ? String(initial.dueDaysFromRequest) : ''
  )
  const [roleError, setRoleError] = useState('')

  function handleSave() {
    if (!role) {
      setRoleError('Please select a role.')
      return
    }
    const parsed = dueDays.trim() !== '' ? parseInt(dueDays, 10) : null
    const dueDaysFromRequest =
      parsed !== null && !isNaN(parsed) && parsed >= 1 && parsed <= 30 ? parsed : null

    onSave({
      stage: 1, // renumbered by parent
      role,
      label: label.trim(),
      assignedUserId: null,
      dueDaysFromRequest,
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[69] flex items-center justify-center p-4"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-node-modal-title"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2
              id="add-node-modal-title"
              className="font-ni-display text-brand-primary dark:text-brand-accent text-lg"
            >
              {mode === 'add' ? 'Add Approval Stage' : 'Edit Approval Stage'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure the approver role and optional settings.
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Role */}
            <div>
              <label
                htmlFor="workflow-node-role"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="workflow-node-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as ApprovalRole)
                  setRoleError('')
                }}
                className="w-full border border-brand-border-field dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
              >
                <option value="">Select a role…</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {roleError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{roleError}</p>
              )}
            </div>

            {/* Label */}
            <div>
              <label
                htmlFor="workflow-node-label"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Label <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="workflow-node-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Brand Guardian Review"
                className="w-full border border-brand-border-field dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
              />
            </div>

            {/* Due days */}
            <div>
              <label
                htmlFor="workflow-node-due-days"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Days to review <span className="text-gray-400 font-normal">(optional, 1–30)</span>
              </label>
              <input
                id="workflow-node-due-days"
                type="number"
                min={1}
                max={30}
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                placeholder="e.g. 3"
                className="w-full border border-brand-border-field dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-brand-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-primary-hover disabled:opacity-40 transition-colors"
            >
              {mode === 'add' ? 'Add Stage' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
