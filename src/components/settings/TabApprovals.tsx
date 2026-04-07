import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { ApprovalConfig, ApprovalStageConfig, ApprovalRole, EmailTypeApprovalConfig } from '../../types/approval.types'

const ROLE_OPTIONS: { value: ApprovalRole; label: string }[] = [
  { value: 'brand_guardian', label: 'Brand Guardian' },
  { value: 'legal', label: 'Legal' },
  { value: 'manager', label: 'Manager' },
  { value: 'reviewer', label: 'Reviewer' },
]

const DEFAULT_APPROVALS_CONFIG: ApprovalConfig = {
  enabled: false,
  defaultStages: [],
  emailTypeConfigs: [],
  selfServiceRequest: true,
  blockDistributionWithoutApproval: false,
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex items-start gap-4 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          onClick={() => onChange(!checked)}
          className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${
            checked ? 'bg-[#134848]' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

interface StageBuilderProps {
  stages: ApprovalStageConfig[]
  onChange: (stages: ApprovalStageConfig[]) => void
}

function StageBuilder({ stages, onChange }: StageBuilderProps) {
  function addStage() {
    const newStage: ApprovalStageConfig = {
      stage: stages.length + 1,
      role: 'reviewer',
      label: '',
      assignedUserId: null,
      dueDaysFromRequest: 2,
    }
    onChange([...stages, newStage])
  }

  function removeStage(index: number) {
    const updated = stages
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, stage: i + 1 }))
    onChange(updated)
  }

  function updateStage(index: number, patch: Partial<ApprovalStageConfig>) {
    onChange(stages.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  return (
    <div className="space-y-3">
      {stages.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
          No stages configured. Add a stage below.
        </p>
      ) : (
        stages.map((stage, i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/40"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stage {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeStage(i)}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                  Role
                </label>
                <select
                  value={stage.role}
                  onChange={(e) => updateStage(i, { role: e.target.value as ApprovalRole })}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                  Days to Review
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={stage.dueDaysFromRequest ?? ''}
                  onChange={(e) =>
                    updateStage(i, {
                      dueDaysFromRequest: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="No deadline"
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                  Stage Label (optional)
                </label>
                <input
                  type="text"
                  value={stage.label}
                  onChange={(e) => updateStage(i, { label: e.target.value })}
                  placeholder={`e.g. ${ROLE_OPTIONS.find((o) => o.value === stage.role)?.label ?? 'Review'}`}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                />
              </div>
            </div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addStage}
        className="flex items-center gap-2 text-sm text-brand-primary dark:text-brand-accent hover:underline"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add stage
      </button>
    </div>
  )
}

export function TabApprovals() {
  const { settings, updateSettings } = useSettings()
  const config: ApprovalConfig = settings.approvals ?? DEFAULT_APPROVALS_CONFIG
  const [expandedEmailType, setExpandedEmailType] = useState<string | null>(null)

  function patch(updates: Partial<ApprovalConfig>) {
    updateSettings({ approvals: { ...config, ...updates } })
  }

  // Get all email types (built-in + custom)
  const allEmailTypes = [
    'newsletter', 'webinar-invitation', 'event-invitation',
    'single-content', 'multiple-content', 'operational',
    ...(settings.customEmailTypes ?? []).map((t) => t.id),
  ]

  function getEmailTypeConfig(emailType: string): EmailTypeApprovalConfig {
    return (
      config.emailTypeConfigs?.find((c) => c.emailType === emailType) ?? {
        emailType,
        stages: [],
        requireAllStages: true,
      }
    )
  }

  function updateEmailTypeConfig(emailType: string, updated: EmailTypeApprovalConfig) {
    const existing = config.emailTypeConfigs ?? []
    const others = existing.filter((c) => c.emailType !== emailType)
    // Only keep configs that have stages defined
    const next = updated.stages.length > 0 ? [...others, updated] : others
    patch({ emailTypeConfigs: next })
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Master toggle */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
          <h3 className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
            Approval Workflow
          </h3>
        </div>

        <div className="bg-brand-bg-panel dark:bg-gray-800/40 border border-brand-border-warm dark:border-gray-700 rounded-lg p-5 space-y-5">
          <Toggle
            checked={config.enabled}
            onChange={(v) => patch({ enabled: v })}
            label="Enable approval workflow"
            description="When enabled, briefs can be submitted for approval before distribution. A new Approvals panel will appear in the navigation."
          />

          {config.enabled && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <Toggle
                checked={config.selfServiceRequest}
                onChange={(v) => patch({ selfServiceRequest: v })}
                label="Allow self-service requests"
                description="Requesters can submit their own briefs for approval. When off, only producers and admins can submit."
              />
              <Toggle
                checked={config.blockDistributionWithoutApproval}
                onChange={(v) => patch({ blockDistributionWithoutApproval: v })}
                label="Block distribution without approval"
                description="Prevent moving a brief to 'Distributed' on the board unless it has an approved approval record."
              />
            </>
          )}
        </div>
      </section>

      {/* Default stage sequence */}
      {config.enabled && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
            <h3 className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
              Default Approval Stages
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Applied when no email-type-specific stages are configured. Stages run in order — each approver must act before the next is notified.
          </p>
          <StageBuilder
            stages={config.defaultStages ?? []}
            onChange={(stages) => patch({ defaultStages: stages })}
          />
        </section>
      )}

      {/* Per-email-type overrides */}
      {config.enabled && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
            <h3 className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
              Per Email-Type Overrides
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure different approval stages for specific email types. Leave empty to use the default stages above.
          </p>
          <div className="space-y-2">
            {allEmailTypes.map((emailType) => {
              const typeConfig = getEmailTypeConfig(emailType)
              const isExpanded = expandedEmailType === emailType
              const hasCustom = (config.emailTypeConfigs ?? []).some((c) => c.emailType === emailType && c.stages.length > 0)

              return (
                <div key={emailType} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedEmailType(isExpanded ? null : emailType)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {emailType.replace(/-/g, ' ')}
                      </span>
                      {hasCustom && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-accent/10 text-brand-primary dark:text-brand-accent">
                          Custom ({typeConfig.stages.length} stage{typeConfig.stages.length !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Override stages for <strong>{emailType.replace(/-/g, ' ')}</strong>. Leave empty to inherit default stages.
                      </p>
                      <StageBuilder
                        stages={typeConfig.stages}
                        onChange={(stages) =>
                          updateEmailTypeConfig(emailType, { ...typeConfig, stages })
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!config.enabled && (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-5 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enable the approval workflow above to configure stages and routing.
          </p>
        </div>
      )}
    </div>
  )
}
