'use client'

interface ResultsNavigationProps {
  hasCurrent: boolean
  hasSettled: boolean
  hasScheduled: boolean
}

export default function ResultsNavigation({ hasCurrent, hasSettled, hasScheduled }: ResultsNavigationProps) {
  const scrollToSection = (sectionType: string) => {
    const element = document.querySelector(`[data-gameweek-type="${sectionType}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      <div className="flex items-center justify-center space-x-8 px-6 py-4">
        {hasCurrent && (
          <button
            onClick={() => scrollToSection('current')}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
          >
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            <span>Current GW</span>
          </button>
        )}
        
        {hasSettled && (
          <button
            onClick={() => scrollToSection('settled')}
            className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors font-medium"
          >
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Settled GWs</span>
          </button>
        )}
        
        {hasScheduled && (
          <button
            onClick={() => scrollToSection('scheduled')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
            <span>Scheduled GWs</span>
          </button>
          )}
      </div>
    </div>
  )
}
