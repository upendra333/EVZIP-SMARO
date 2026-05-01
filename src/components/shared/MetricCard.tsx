import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'info'
  /** Override default title typography (e.g. summary chips) */
  titleClassName?: string
  /** Override default value typography */
  valueClassName?: string
}

export function MetricCard({
  title,
  value,
  icon,
  onClick,
  variant = 'default',
  titleClassName,
  valueClassName,
}: MetricCardProps) {
  const variantStyles = {
    default: 'bg-white border-gray-200 hover:border-primary',
    primary: 'bg-primary/10 border-primary',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div
      onClick={onClick}
      className={`
        p-6 rounded-lg border-2 transition-all cursor-pointer
        ${variantStyles[variant]}
        ${onClick ? 'hover:shadow-md' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className={
              titleClassName ?? 'text-sm font-medium text-gray-600 mb-1'
            }
          >
            {title}
          </p>
          <p className={valueClassName ?? 'text-2xl font-bold text-text'}>{value}</p>
        </div>
        {icon && (
          <div className="text-3xl opacity-50">{icon}</div>
        )}
      </div>
    </div>
  )
}

