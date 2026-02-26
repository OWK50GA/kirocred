'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import WalletConnect from './WalletConnect'
import Image from 'next/image'

interface HeaderProps {
  currentPage?: 'home' | 'issuer' | 'prove' | 'verify'
}

export function Header({ currentPage }: HeaderProps) {
  const navItems = [
    { href: '/', label: 'Home', id: 'home' },
    { href: '/issuer', label: 'Issue', id: 'issuer' },
    { href: '/prove', label: 'Prove', id: 'prove' },
    { href: '/verify', label: 'Verify', id: 'verify' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-80">
            {/* <div className="flex items-center justify-center rounded-lg bg-linear-to-br from-[#00D9FF] to-[#00BBFF] p-2 shadow-lg">
              <span className="text-xl font-bold text-black">K</span>
            </div> */}
            <Image 
              src={"/assets/kirocred-logo.png"}
              alt='Kirocred Logo'
              width={50}
              height={50}
            />
            <span className="hidden font-semibold text-white sm:inline">irocred</span>
          </Link>
        </div>

        <nav className="hidden md:flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'px-4 py-2 rounded-md font-medium transition-all',
                currentPage === item.id
                  ? 'bg-[#00D9FF] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400 hidden sm:block">
            Privacy-Preserving Credentials
          </div>
          <WalletConnect />
        </div>
      </div>
    </header>
  )
}