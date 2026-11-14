'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck, FileText, UserX, Lock, Newspaper, Mail, ExternalLink } from 'lucide-react'

export default function Footer() {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()

  // Do not display public footer inside the admin panel
  if (pathname && pathname.startsWith('/admin')) {
    return null
  }

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white p-0.5 shadow-md flex items-center justify-center">
                <img src="/logo.png" alt="Shadow News" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Shadow News</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time ground news, hyperlocal updates, and video shorts empowering citizens across Telangana and Andhra Pradesh.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="w-3.5 h-3.5 text-red-500" />
              <a href="mailto:info@shadownews.in" className="hover:text-white transition-colors">
                info@shadownews.in
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a
                  href="https://m.shadownews.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  Live Web App <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <Link href="/admin" className="hover:text-red-400 transition-colors inline-flex items-center gap-1 font-medium">
                  <Lock className="w-3 h-3" /> Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/delete-account" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-amber-400" /> Delete Account / Data
                </Link>
              </li>
            </ul>
          </div>

          {/* Coverage Summary */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Regional Coverage</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Covering all 33 districts in Telangana & 26 districts in Andhra Pradesh down to the mandal and village level.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-[11px] text-red-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              24/7 Realtime Telugu Journalism
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {currentYear} Shadow News. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <span>•</span>
            <Link href="/delete-account" className="hover:text-white transition-colors">Data Request</Link>
            <span>•</span>
            <Link href="/admin" className="hover:text-red-400 transition-colors">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
