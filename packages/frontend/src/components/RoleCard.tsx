'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RoleCardProps {
  href: string
  icon: ReactNode
  title: string
  description: string
  color?: 'blue' | 'purple'
}

export function RoleCard({
  href,
  icon,
  title,
  description,
  color = 'blue',
}: RoleCardProps) {
  const colorClasses = {
    blue: 'from-[#00D9FF]/20 to-[#00D9FF]/5 border-[#00D9FF]/30 hover:border-[#00D9FF]/60 hover:from-[#00D9FF]/30 hover:to-[#00D9FF]/10',
    purple: 'from-[#A855F7]/20 to-[#A855F7]/5 border-[#A855F7]/30 hover:border-[#A855F7]/60 hover:from-[#A855F7]/30 hover:to-[#A855F7]/10',
  }

  return (
    <Link href={href}>
      <div
        className={cn(
          'relative group h-full p-8 rounded-xl border transition-all duration-300',
          'bg-gradient-to-br hover:shadow-lg hover:shadow-[#00D9FF]/20',
          'cursor-pointer overflow-hidden',
          colorClasses[color]
        )}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#00D9FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Icon */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#00D9FF]/30 to-[#A855F7]/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>

          {/* Content */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#00D9FF] transition-colors">
              {title}
            </h3>
            <p className="text-gray-400 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Arrow indicator */}
          <div className="flex items-center gap-2 text-[#00D9FF] font-semibold mt-2">
            <span>Get Started</span>
            <span className="group-hover:translate-x-2 transition-transform duration-300">
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}