import { useEffect, useState } from 'react'

interface ErrorToastProps {
  message: string
  onDismiss: () => void
  duration?: number
}

export function ErrorToast({ message, onDismiss, duration = 5000 }: ErrorToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300) // allow fade-out
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div
      className={`fixed bottom-4 right-4 z-[100] max-w-sm bg-red-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
        className="text-white/80 hover:text-white shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
