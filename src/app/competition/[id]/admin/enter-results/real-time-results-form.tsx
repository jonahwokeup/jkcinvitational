"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateFixtureResult } from '@/lib/actions'

interface Fixture {
  id: string
  homeTeam: string
  awayTeam: string
  homeGoals: number | null
  awayGoals: number | null
  status: string
  kickoff: string
}

interface Gameweek {
  id: string
  gameweekNumber: number
  isSettled: boolean
  fixtures: Fixture[]
}

interface RealTimeResultsFormProps {
  competitionId: string
}

export default function RealTimeResultsForm({ competitionId }: RealTimeResultsFormProps) {
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGameweek, setSelectedGameweek] = useState<string>('')
  const [updatingFixtures, setUpdatingFixtures] = useState<Set<string>>(new Set())
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
  }

  const handleFixtureUpdate = async (fixtureId: string, homeGoals: number, awayGoals: number) => {
    if (isNaN(homeGoals) || isNaN(awayGoals)) {
      alert('Please enter valid goal numbers')
      return
    }

    setUpdatingFixtures(prev => new Set(prev).add(fixtureId))
    
    try {
      const result = await updateFixtureResult(fixtureId, homeGoals, awayGoals)
      
      if (result?.success) {
        alert('Fixture result updated successfully!')
        // Refresh the data to show updated status
        fetchGameweeks()
      } else {
        alert(result?.error || 'Failed to update fixture result')
      }
    } catch (error) {
      console.error('Error updating fixture result:', error)
      alert('Error updating fixture result')
    } finally {
      setUpdatingFixtures(prev => {
        const newSet = new Set(prev)
        newSet.delete(fixtureId)
        return newSet
      })
    }
  }

  const selectedGameweekData = gameweeks.find(gw => gw.id === selectedGameweek)

  const getFixtureStatus = (fixture: Fixture) => {
    if (fixture.status === 'FINISHED') {
      return 'bg-green-100 text-green-800'
    } else if (new Date(fixture.kickoff) < new Date()) {
      return 'bg-yellow-100 text-yellow-800'
    } else {
      return 'bg-gray-100 text-gray-800'
    }
  }

  const getFixtureStatusText = (fixture: Fixture) => {
    if (fixture.status === 'FINISHED') {
      return 'Finished'
    } else if (new Date(fixture.kickoff) < new Date()) {
      return 'In Progress'
    } else {
      return 'Scheduled'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-Time Results Update</h2>
      
      <div className="mb-6">
        <label htmlFor="gameweek" className="block text-sm font-medium text-gray-700 mb-2">
          Select Gameweek
        </label>
        <select
          id="gameweek"
          value={selectedGameweek}
          onChange={(e) => handleGameweekChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Choose a gameweek...</option>
          {gameweeks
            .filter(gw => !gw.isSettled)
            .map((gameweek) => (
              <option key={gameweek.id} value={gameweek.id}>
                Gameweek {gameweek.gameweekNumber}
              </option>
            ))}
        </select>
      </div>

      {selectedGameweekData && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Gameweek {selectedGameweekData.gameweekNumber} - Live Updates
            </h3>
            <p className="text-sm text-gray-600">
              Update individual fixture results as matches finish. The gameweek will automatically settle when all fixtures are complete.
            </p>
          </div>

          <div className="space-y-4">
            {selectedGameweekData.fixtures.map((fixture) => (
              <div
                key={fixture.id}
                className={`p-4 border rounded-lg ${
                  fixture.status === 'FINISHED' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">
                        {fixture.homeTeam} vs {fixture.awayTeam}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFixtureStatus(fixture)}`}>
                        {getFixtureStatusText(fixture)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(fixture.kickoff).toLocaleString()}
                    </p>
                  </div>
                  
                  {fixture.status === 'FINISHED' && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {fixture.homeGoals} - {fixture.awayGoals}
                      </div>
                      <div className="text-xs text-gray-500">Final Score</div>
                    </div>
                  )}
                </div>

                {fixture.status !== 'FINISHED' && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">
                        {fixture.homeTeam} Goals:
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        placeholder="0"
                        id={`home-${fixture.id}`}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">
                        {fixture.awayTeam} Goals:
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        placeholder="0"
                        id={`away-${fixture.id}`}
                      />
                    </div>
                    
                    <button
                      onClick={() => {
                        const homeGoals = parseInt((document.getElementById(`home-${fixture.id}`) as HTMLInputElement).value)
                        const awayGoals = parseInt((document.getElementById(`away-${fixture.id}`) as HTMLInputElement).value)
                        handleFixtureUpdate(fixture.id, homeGoals, awayGoals)
                      }}
                      disabled={updatingFixtures.has(fixture.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingFixtures.has(fixture.id) ? 'Updating...' : 'Update Result'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedGameweekData.isSettled && (
            <div className="mt-6 p-4 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-green-800">
                  <strong>Gameweek {selectedGameweekData.gameweekNumber} is now settled!</strong>
                  <p className="text-sm mt-1">All fixtures have results and eliminations have been processed.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
