'use client'

import { cn } from '@/lib/utils'

interface StatusIndicatorProps {
  status: 'success' | 'error' | 'warning' | 'verified' | 'pending'
  label: string
  message?: string
}

export function StatusIndicator({ status, label, message }: StatusIndicatorProps) {
  const statusConfig = {
    success: {
      icon: '✓',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      iconColor: 'text-green-400',
    },
    verified: {
      icon: '✓',
      bgColor: 'bg-[#00D9FF]/10',
      borderColor: 'border-[#00D9FF]/30',
      textColor: 'text-[#00D9FF]',
      iconColor: 'text-[#00D9FF]',
    },
    error: {
      icon: '✗',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      iconColor: 'text-red-400',
    },
    warning: {
      icon: '⚠',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      iconColor: 'text-yellow-400',
    },
    pending: {
      icon: '⏳',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30',
      textColor: 'text-gray-400',
      iconColor: 'text-gray-400',
    },
  }

  const config = statusConfig[status]

  return (
    <div className={cn(
      'p-3 rounded-lg border flex items-center gap-3',
      config.bgColor,
      config.borderColor
    )}>
      <span className={cn('text-lg', config.iconColor)}>{config.icon}</span>
      <div>
        <p className={cn('font-medium', config.textColor)}>{label}</p>
        {message && (
          <p className="text-sm text-gray-400">{message}</p>
        )}
      </div>
    </div>
  )
}