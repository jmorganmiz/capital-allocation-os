export default function DealLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-gray-100 rounded-md animate-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-20 bg-gray-100 rounded animate-pulse mb-3" />
        ))}
      </div>

      {/* Content tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>

      {/* Notes area */}
      <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  )
}
