'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
    onClose: () => void
    children: React.ReactNode
    borderColor?: string
    title?: string
}

export default function Modal({ onClose, children, borderColor = 'border-blue-light/30', title }: ModalProps) {
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onCloseRef.current()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    return (
        <div
            className="fixed inset-0 bg-dark/85 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            role="presentation"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className={`bg-dark border border-blue/30 p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto`}>
                {children}
            </div>
        </div>
    )
}
