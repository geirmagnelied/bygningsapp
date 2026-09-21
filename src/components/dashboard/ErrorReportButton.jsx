import { useState } from 'react'
import ErrorReportModal from './ErrorReportModal'

export default function ErrorReportButton({ onCreated }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-status-open px-4 text-base font-semibold text-white shadow-sm transition hover:brightness-95"
      >
        ⚠️ Varsle om feil
      </button>
      {open && (
        <ErrorReportModal
          onClose={() => setOpen(false)}
          onCreated={onCreated}
        />
      )}
    </>
  )
}
