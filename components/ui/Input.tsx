'use client'

import { InputHTMLAttributes, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string
    hint?: string
    error?: string
    validate?: (value: string) => string | undefined
}

export default function Input({ label, hint, error: externalError, validate, className = '', onBlur, ...props }: InputProps) {
    const [liveError, setLiveError] = useState<string | undefined>()

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
        if (validate) setLiveError(validate(e.target.value))
        onBlur?.(e)
    }

    const error = externalError ?? liveError

    return (
        <div className="flex flex-col gap-2">
            <label className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted flex items-center gap-2">
                {label}
                {hint && <span className="text-gray-muted/50 normal-case tracking-normal">{hint}</span>}
            </label>
            <input
                className={`
                    bg-dark/40 border text-white placeholder:text-gray-muted/30
                    px-4 py-3 text-sm focus:outline-none transition-colors
                    ${error ? 'border-accent/60 focus:border-accent' : 'border-blue/30 focus:border-blue-light'}
                    ${className}
                `}
                onBlur={handleBlur}
                {...props}
            />
            {error && (
                <p className="text-accent text-xs font-condensed tracking-wide">{error}</p>
            )}
        </div>
    )
}
