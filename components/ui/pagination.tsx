interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
      >
        ‹
      </button>
      
      <div className="flex items-center gap-1 px-3 py-1 bg-zinc-800 rounded-full text-sm">
        <span className="font-medium text-white">{currentPage}</span>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-400">{totalPages}</span>
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
      >
        ›
      </button>
    </div>
  )
} 