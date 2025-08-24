"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { enterGameweekResults } from '@/lib/actions'

interface Fixture {
  id: string
  homeTeam: string
  awayTeam: string
  homeGoals: number | null
  awayGoals: number | null
  status: string
}

interface Gameweek {
  id: string
  gameweekNumber: number
  isSettled: boolean
  fixtures: Fixture[]
}

interface EnterResultsFormProps {
  competitionId: string
}

export default function EnterResultsForm({ competitionId }: EnterResultsFormProps) {
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGameweek, setSelectedGameweek] = useState<string>('')
  const [results, setResults] = useState<Record<string, { homeGoals: string; awayGoals: string }>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const fetchGameweeks = useCallback(async () => {
    try {
      const response = await fetch(`/api/competition/${competitionId}/gameweeks`)
      if (response.ok) {
        const data = await response.json()
        setGameweeks(data.gameweeks)
      }
    } catch (error) {
      console.error('Error fetching gameweeks:', error)
    }
  }, [competitionId])

  useEffect(() => {
    fetchGameweeks()
  }, [fetchGameweeks])

  const handleGameweekChange = (gameweekId: string) => {
    setSelectedGameweek(gameweekId)
    setResults({})
    
    const gameweek = gameweeks.find(gw => gw.id === gameweekId)
    if (gameweek) {
      const initialResults: Record<string, { homeGoals: string; awayGoals: string }> = {}
      gameweek.fixtures.forEach(fixture => {
        initialResults[fixture.id] = {
          homeGoals: fixture.homeGoals?.toString() || '',
          awayGoals: fixture.awayGoals?.toString() || ''
        }
      })
      setResults(initialResults)
    }
  }

  const handleResultChange = (fixtureId: string, field: 'homeGoals' | 'awayGoals', value: string) => {
    setResults(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGameweek) return

    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('gameweekId', selectedGameweek)
      
      // Add all results
      Object.entries(results).forEach(([fixtureId, result]) => {
        if (result.homeGoals && result.awayGoals) {
          formData.append(`results[${fixtureId}][homeGoals]`, result.homeGoals)
          formData.append(`results[${fixtureId}][awayGoals]`, result.awayGoals)
        }
      })
      
      const result = await enterGameweekResults(formData)
      
      if (result?.success) {
        alert('Results entered successfully!')
        router.push(`/competition/${competitionId}/admin`)
      } else {
        alert(result?.error || 'Failed to enter results')
      }
    } catch (error) {
      console.error('Error submitting results:', error)
      alert('Error submitting results')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedGameweekData = gameweeks.find(gw => gw.id === selectedGameweek)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Gameweek Selection */}
        <div>
          <label htmlFor="gameweek" className="block text-sm font-medium text-gray-700 mb-2">
            Select Gameweek
          </label>
          <select
            id="gameweek"
            value={selectedGameweek}
            onChange={(e) => handleGameweekChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Choose a gameweek...</option>
            {gameweeks
              .filter(gw => !gw.isSettled)
              .map(gameweek => (
                <option key={gameweek.id} value={gameweek.id}>
                  Gameweek {gameweek.gameweekNumber}
                </option>
              ))}
          </select>
        </div>

        {/* Results Form */}
        {selectedGameweekData && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Enter Results for Gameweek {selectedGameweekData.gameweekNumber}
            </h3>
            
            {selectedGameweekData.fixtures.map(fixture => (
              <div key={fixture.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">{fixture.homeTeam}</span>
                  <span className="text-gray-500">vs</span>
                  <span className="font-medium text-gray-900">{fixture.awayTeam}</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Home Goals</label>
                    <input
                      type="number"
                      min="0"
                      value={results[fixture.id]?.homeGoals || ''}
                      onChange={(e) => handleResultChange(fixture.id, 'homeGoals', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="text-2xl font-bold text-gray-400">-</div>
                  
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Away Goals</label>
                    <input
                      type="number"
                      min="0"
                      value={results[fixture.id]?.awayGoals || ''}
                      onChange={(e) => handleResultChange(fixture.id, 'awayGoals', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedGameweek || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Entering Results...' : 'Enter Results'}
          </button>
        </div>
      </form>
    </div>
  )
}

