export default function AppLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="flex-1 px-6 pb-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  )
}
