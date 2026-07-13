"use client"
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm"
    >
      Print / Save as PDF
    </button>
  )
}
