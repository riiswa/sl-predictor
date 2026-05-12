'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
    onClose: () => void
    children: React.ReactNode
    borderColor?: string
    title?: string
}

export default function Modal({ onClose, children, borderColor = 'border-blue-light/30', title }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null)
    const previousActiveElement = useRef<HTMLElement | null>(null)

    useEffect(() => {
        previousActiveElement.current = document.activeElement as HTMLElement

        if (panelRef.current) {
            panelRef.current.focus()
        }

        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()

            // Focus trap
            if (e.key === 'Tab') {
                const focusableElements = panelRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
                if (!focusableElements?.length) return

                const firstElement = focusableElements[0] as HTMLElement
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault()
                        lastElement.focus()
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault()
                        firstElement.focus()
                    }
                }
            }
        }
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            previousActiveElement.current?.focus()
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 bg-dark/85 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            role="presentation"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "modal-title" : undefined}
                className={`bg-dark border ${borderColor} p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto`}
                tabIndex={-1}
            >
                {title && <h2 id="modal-title" className="sr-only">{title}</h2>}
                {children}
            </div>
        </div>
    )
}
