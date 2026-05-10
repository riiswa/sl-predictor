'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
    onClose: () => void
    children: React.ReactNode
    borderColor?: string
}

export default function Modal({ onClose, children, borderColor = 'border-blue-light/30' }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 bg-dark/85 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div ref={panelRef} className={`bg-dark border ${borderColor} p-8 max-w-md w-full max-h-[90vh] overflow-y-auto`}>
                {children}
            </div>
        </div>
    )
}
