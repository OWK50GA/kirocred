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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Home', id: 'home' },
    { href: '/issuer', label: 'Issue', id: 'issuer' },
    { href: '/prove', label: 'Prove', id: 'prove' },
    { href: '/verify', label: 'Verify', id: 'verify' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur supports-backdrop-filter:bg-black/60">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image 
              src={"/assets/kirocred-logo.png"}
              alt='Kirocred Logo'
              width={50}
              height={50}
            />
            <span className="hidden font-semibold text-white sm:inline">irocred</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex gap-1">
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
          <div className="text-sm text-gray-400 hidden md:block">
            Privacy-Preserving Credentials
          </div>
          <WalletConnect />
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav className="sm:hidden border-t border-gray-800 bg-black">
          <div className="px-6 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-md font-medium transition-all',
                  currentPage === item.id
                    ? 'bg-[#00D9FF] text-black'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}