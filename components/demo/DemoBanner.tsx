'use client'

import Link from 'next/link'

export default function DemoBanner() {
  return (
    <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="flex-shrink-0 bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded">DEMO</span>
        <span className="text-gray-300 truncate">
          You're exploring a live demo with sample data. Changes are local only.
        </span>
      </div>
      {/* Hidden on mobile — top bar has its own Sign up button */}
      <Link
        href="/signup"
        className="hidden md:inline-flex flex-shrink-0 bg-white text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
      >
        Sign up free →
      </Link>
    </div>
  )
}
