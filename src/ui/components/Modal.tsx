import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../../i18n/I18nContext'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog layered over the page: full screen below `sm`, centered window above. Closes on the
 * Close button, Escape and a click on the backdrop. While open, the page does not scroll, Tab
 * stays inside the dialog, and focus returns to the previously focused element on close.
 */
export function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const { t } = useT()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  // A click that starts inside the dialog and ends on the backdrop (text selection) must not close.
  const pressedOnBackdrop = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const previousOverflow = html.style.overflow
    // `overflow: hidden` on the root keeps the window scroll offset, so the list underneath stays put.
    html.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      const dialog = dialogRef.current
      if (!dialog) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      const active = document.activeElement
      if (!items.length) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const outside = !dialog.contains(active)
      if (e.shiftKey && (outside || active === first || active === dialog)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      html.style.overflow = previousOverflow
      // preventScroll: the list must come back exactly where it was.
      if (previous && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/70 sm:items-center sm:p-6"
      onPointerDown={(e) => (pressedOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose()
        pressedOnBackdrop.current = false
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="flex h-full w-full flex-col bg-bg outline-none sm:h-auto sm:max-h-full sm:max-w-4xl sm:rounded-xl sm:border sm:border-line sm:shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line py-1 pl-4 pr-1" style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top))' }}>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted">{label}</span>
          <button type="button" className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-ink" aria-label={t('common.close')} title={t('common.close')} onClick={onClose}>
            <X size={20} className="shrink-0" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
