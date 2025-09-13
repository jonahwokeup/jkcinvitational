"use client"

import { useState } from 'react'
import { Target, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ExactoButtonProps {
  entryId: string
  gameweekId: string
  competitionId: string
  isEliminated: boolean
  hasExacto: boolean
  currentExacto?: {
    fixtureId: string
    homeGoals: number
    awayGoals: number
  }
  gameweekNumber?: number
  onExactoChange?: () => void
}

export default function ExactoButton({ 
  entryId, 
  gameweekId, 
  competitionId, 
  isEliminated, 
  hasExacto, 
  currentExacto,
  gameweekNumber,
  onExactoChange 
}: ExactoButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState('')
  const [homeGoals, setHomeGoals] = useState('')
  const [awayGoals, setAwayGoals] = useState('')
  const [fixtures, setFixtures] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [teamsUsed, setTeamsUsed] = useState<string[]>([])
  const [currentPrediction, setCurrentPrediction] = useState<any>(null)

  const openModal = async () => {
    if (isSubmitting) return
    
    try {
      // Fetch available fixtures for the next gameweek
      const response = await fetch(`/api/competition/${competitionId}/exacto?gameweekId=${gameweekId}`)
      const data = await response.json()
      
      if (data.success) {
        setFixtures(data.fixtures)
        setTeamsUsed(data.teamsUsed || [])
        // Always use the current exacto from props when opening modal
        setCurrentPrediction(currentExacto)
        setIsOpen(true)
      } else {
        alert('Failed to load fixtures')
      }
    } catch (error) {
      console.error('Error loading fixtures:', error)
      alert('Error loading fixtures')
    }
  }

  const revokeExacto = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/competition/${competitionId}/exacto`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          gameweekId
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Exacto revoked successfully, showing success message')
        setSuccessMessage('Exacto Revoked. Save it for later ;)')
        setShowSuccess(true)
        setCurrentPrediction(null)
        // Notify parent component to refresh data
        if (onExactoChange) {
          onExactoChange()
        }
        setTimeout(() => {
          setShowSuccess(false)
          setIsOpen(false)
          // Reset form
          setSelectedFixture('')
          setHomeGoals('')
          setAwayGoals('')
          // Refresh the page to show updated data
          router.refresh()
        }, 3000)
      } else {
        alert(data.error || 'Failed to revoke Exacto prediction')
      }
    } catch (error) {
      console.error('Error revoking Exacto:', error)
      alert('Failed to revoke Exacto prediction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitExacto = async () => {
    if (!selectedFixture || !homeGoals || !awayGoals) {
      alert('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/competition/${competitionId}/exacto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          gameweekId,
          fixtureId: selectedFixture,
          homeGoals: parseInt(homeGoals),
          awayGoals: parseInt(awayGoals)
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Exacto submitted successfully, showing success message')
        setSuccessMessage('Exacto submitted. This is gonna hit so hard if you nail it...')
        setShowSuccess(true)
        // Update the current prediction display
        const updatedPrediction = {
          fixtureId: selectedFixture,
          homeGoals: parseInt(homeGoals),
          awayGoals: parseInt(awayGoals)
        }
        setCurrentPrediction(updatedPrediction)
        // Notify parent component to refresh data
        if (onExactoChange) {
          onExactoChange()
        }
        setTimeout(() => {
          setShowSuccess(false)
          setIsOpen(false)
          // Reset form
          setSelectedFixture('')
          setHomeGoals('')
          setAwayGoals('')
          // Refresh the page to show updated data
          router.refresh()
        }, 3000)
      } else {
        alert(data.error || 'Failed to submit Exacto prediction')
      }
    } catch (error) {
      console.error('Error submitting Exacto:', error)
      alert('Error submitting Exacto prediction')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isEliminated) return null

  return (
    <>
      <button
        onClick={openModal}
        disabled={isSubmitting}
        className="flex items-center space-x-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-700 text-xs font-medium rounded transition-colors"
      >
        <span>🎯</span>
        <span>{hasExacto ? 'View' : 'Submit'} GW{gameweekNumber} Exacto</span>
      </button>

      {/* Success Message */}
      {showSuccess && (
        console.log('🎉 Rendering success modal with message:', successMessage),
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <img 
              src="/thatsthat.GIF" 
              alt="Success" 
              className="w-32 h-32 mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {successMessage}
            </h3>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {hasExacto ? 'View Exacto Prediction' : 'Submit Exacto Prediction'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>



            <div className="space-y-4">
              {/* Current Exacto Prediction */}
              {(hasExacto && currentExacto) || currentPrediction ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Current Exacto Prediction</h4>
                  <p className="text-sm text-purple-700">
                    {(() => {
                      const prediction = currentPrediction || currentExacto
                      const fixture = fixtures.find(f => f.id === prediction.fixtureId)
                      return `${fixture?.homeTeam} ${prediction.homeGoals} - ${prediction.awayGoals} ${fixture?.awayTeam}`
                    })()}
                  </p>
                </div>
              ) : null}

              {/* Teams Used Section */}
              {teamsUsed.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Teams Used This Round</h4>
                  <div className="flex flex-wrap gap-2">
                    {teamsUsed.map((team) => (
                      <span key={team} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Fixtures - Only show if no existing exacto */}
              {!hasExacto && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Fixture to Predict
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {fixtures.map((fixture) => (
                      <button
                        key={fixture.id}
                        onClick={() => setSelectedFixture(fixture.id)}
                        className={`p-3 text-left border rounded-lg transition-colors ${
                          selectedFixture === fixture.id
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">
                          {fixture.homeTeam} vs {fixture.awayTeam}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Goal Inputs - Only show if no existing exacto */}
              {!hasExacto && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {selectedFixture ? fixtures.find(f => f.id === selectedFixture)?.homeTeam : 'Home Team'} Goals
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={homeGoals}
                      onChange={(e) => setHomeGoals(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {selectedFixture ? fixtures.find(f => f.id === selectedFixture)?.awayTeam : 'Away Team'} Goals
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={awayGoals}
                      onChange={(e) => setAwayGoals(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* One Exacto Per Round Message */}
              {hasExacto && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-400 text-xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">
                        One Exacto Per Round
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        You have already submitted an exacto prediction for this gameweek. 
                        You can only submit one exacto per round.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-6">
              {/* Revoke Exacto Button - Only show if user has an existing prediction and gameweek is not locked */}
              {(hasExacto && currentExacto) || currentPrediction ? (
                <button
                  onClick={revokeExacto}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 text-red-700 font-medium rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Revoking...' : 'Revoke Exacto'}
                </button>
              ) : (
                <div></div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {hasExacto ? 'Close' : 'Cancel'}
                </button>
                {/* Only show submit button if user doesn't have an exacto yet */}
                {!hasExacto && (
                  <button
                    onClick={submitExacto}
                    disabled={isSubmitting || !selectedFixture || !homeGoals || !awayGoals}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Exacto'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
