function Header() {
  return (
    <header className="bg-[#1a1a2e] text-white px-6 py-3 flex items-center gap-4 shadow-md z-10">
      <div className="flex items-center gap-3">
        <svg className="w-7 h-7" viewBox="0 0 40 40" fill="none">
          {/* Google BigQuery logo */}
          <rect width="40" height="40" rx="8" fill="#4285F4" />
          <circle cx="19" cy="19" r="12" fill="white" />
          <circle cx="19" cy="19" r="10" fill="#4285F4" />
          <rect x="13" y="16" width="3" height="7" rx="1" fill="white" />
          <rect x="18" y="12" width="3" height="11" rx="1" fill="white" />
          <rect x="23" y="18" width="3" height="5" rx="1" fill="white" />
          <path d="M27 27L34 34" stroke="white" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <h1 className="text-lg font-medium tracking-wide">BigQuery Viewer</h1>
      </div>
      <div className="flex-1" />
      <span className="text-sm text-gray-300 hidden sm:block">
        Google BigQuery Console
      </span>
    </header>
  )
}

export default Header
