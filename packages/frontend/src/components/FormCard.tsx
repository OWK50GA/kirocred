'use client'

import { ReactNode } from 'react'

interface FormCardProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
}

export function FormCard({ title, description, icon, children }: FormCardProps) {
  return (
    <div className="p-6 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}