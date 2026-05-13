import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
}

export default function Button({
                                   variant = 'primary',
                                   size = 'md',
                                   loading = false,
                                   children,
                                   className = '',
                                   disabled,
                                   ...props
                               }: ButtonProps) {
    const base = 'font-condensed tracking-[2px] uppercase text-white transition-all duration-200 clip-skew disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

    const variants = {
        primary: 'bg-accent hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-400/20',
        ghost:   'bg-transparent border border-blue/30 text-gray-muted hover:text-white hover:border-blue-light hover:shadow-sm hover:shadow-blue/20',
        danger:  'bg-transparent border border-accent/30 text-accent hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/20',
    }

    const sizes = {
        sm: 'text-xs px-5 py-2',
        md: 'text-sm px-7 py-3',
        lg: 'text-sm px-10 py-4',
    }

    return (
        <button
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            aria-busy={loading}
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    )
}