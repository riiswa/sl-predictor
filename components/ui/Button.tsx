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
    const base = 'font-condensed font-semibold tracking-[2px] uppercase transition-all clip-skew disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
        primary: 'bg-accent text-white hover:bg-orange-500',
        ghost:   'bg-transparent border border-blue/40 text-gray-muted hover:text-white hover:border-blue-light',
        danger:  'bg-transparent border border-accent/40 text-accent hover:bg-accent hover:text-white',
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
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    )
}