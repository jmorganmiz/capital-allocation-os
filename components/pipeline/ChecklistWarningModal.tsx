'use client'

import { StageChecklistItem } from '@/lib/types/database'

interface Props {
  dealTitle: string
  stageName: string
  incompleteItems: StageChecklistItem[]
  onProceed: () => void
  onCancel: () => void
}

export default function ChecklistWarningModal({
  dealTitle,
  stageName,
  incompleteItems,
  onProceed,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Incomplete checklist items</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-gray-700">{dealTitle}</span> has{' '}
              {incompleteItems.length} incomplete item{incompleteItems.length !== 1 ? 's' : ''} for the{' '}
              <span className="font-medium text-gray-700">{stageName}</span> stage.
            </p>
          </div>
        </div>

        <ul className="mb-5 space-y-1.5 pl-11">
          {incompleteItems.map(item => (
            <li key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0 inline-block" />
              {item.name}
            </li>
          ))}
        </ul>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-ghost">
            Stay
          </button>
          <button onClick={onProceed} className="btn-primary">
            Move anyway
          </button>
        </div>
      </div>
    </div>
  )
}
