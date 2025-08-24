'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Fixture {
  id: string
  homeTeam: string
  awayTeam: string
  kickoff: Date
  homeGoals: number | null
  awayGoals: number | null
  status: string
  gameweekId: string
}

interface Gameweek {
  id: string
  gameweekNumber: number
  fixtures: Fixture[]
}

interface Pick {
  id: string
  team: string
  fixture: Fixture
}

interface Entry {
  id: string
  user: {
    id: string
    name: string | null
    email: string
  }
  picks: Pick[]
  livesRemaining: number
}

interface Round {
  id: string
  roundNumber: number
  entries: Entry[]
}

interface ManagePicksFormProps {
  competition: any
  gameweeks: Gameweek[]
  rounds: Round[]
}

export default function ManagePicksForm({ competition, gameweeks, rounds }: ManagePicksFormProps) {
  const router = useRouter()
  const [selectedRound, setSelectedRound] = useState<string>('')
  const [selectedGameweek, setSelectedGameweek] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const currentRound = rounds.find(r => r.id === selectedRound)
  const currentGameweek = gameweeks.find(gw => gw.id === selectedGameweek)

  const handleCreatePick = async (entryId: string, fixtureId: string, team: string) => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/competition/picks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          fixtureId,
          team,
        }),
      })

      if (response.ok) {
        setMessage('Pick created successfully!')
        router.refresh()
      } else {
        const error = await response.text()
        setMessage(`Error: ${error}`)
      }
    } catch (error) {
      setMessage('Error creating pick')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePick = async (pickId: string, team: string) => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/competition/picks/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickId,
          team,
        }),
      })

      if (response.ok) {
        setMessage('Pick updated successfully!')
        router.refresh()
      } else {
        const error = await response.text()
        setMessage(`Error: ${error}`)
      }
    } catch (error) {
      setMessage('Error updating pick')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePick = async (pickId: string) => {
    if (!confirm('Are you sure you want to delete this pick?')) return

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/competition/picks/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickId,
        }),
      })

      if (response.ok) {
        setMessage('Pick deleted successfully!')
        router.refresh()
      } else {
        const error = await response.text()
        setMessage(`Error: ${error}`)
      }
    } catch (error) {
      setMessage('Error deleting pick')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-500' : 'bg-green-500'} text-white`}>
          {message}
        </div>
      )}

      {/* Selection Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="round" className="block text-sm font-medium text-white mb-2">
            Select Round
          </label>
          <select
            id="round"
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a round...</option>
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                Round {round.roundNumber}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gameweek" className="block text-sm font-medium text-white mb-2">
            Select Gameweek
          </label>
          <select
            id="gameweek"
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a gameweek...</option>
            {gameweeks.map((gameweek) => (
              <option key={gameweek.id} value={gameweek.id}>
                Gameweek {gameweek.gameweekNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Picks Display */}
      {currentRound && currentGameweek && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Picks for Round {currentRound.roundNumber} - Gameweek {currentGameweek.gameweekNumber}
          </h3>

          <div className="space-y-4">
            {currentRound.entries.map((entry) => {
              const existingPick = entry.picks.find(pick => 
                pick.fixture.gameweekId === currentGameweek.id
              )

              return (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{entry.user.name}</h4>
                      <p className="text-sm text-gray-600">{entry.user.email}</p>
                      <p className="text-sm text-blue-600">Lives: {entry.livesRemaining}</p>
                    </div>
                    <div className="text-right">
                      {existingPick ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pick Made
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          No Pick
                        </span>
                      )}
                    </div>
                  </div>

                  {existingPick ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600">Current Pick:</span>
                        <span className="font-medium text-gray-900">{existingPick.team}</span>
                        <span className="text-sm text-gray-500">
                          ({existingPick.fixture.homeTeam} v {existingPick.fixture.awayTeam})
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const newTeam = existingPick.team === existingPick.fixture.homeTeam 
                              ? existingPick.fixture.awayTeam 
                              : existingPick.fixture.homeTeam
                            handleUpdatePick(existingPick.id, newTeam)
                          }}
                          disabled={isLoading}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
                        >
                          Switch Team
                        </button>
                        <button
                          onClick={() => handleDeletePick(existingPick.id)}
                          disabled={isLoading}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">No pick made yet. Create one:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {currentGameweek.fixtures.map((fixture) => (
                          <div key={fixture.id} className="border border-gray-200 rounded p-2">
                            <div className="text-xs text-gray-600 mb-1">
                              {fixture.homeTeam} v {fixture.awayTeam}
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleCreatePick(entry.id, fixture.id, fixture.homeTeam)}
                                disabled={isLoading}
                                className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50"
                              >
                                {fixture.homeTeam}
                              </button>
                              <button
                                onClick={() => handleCreatePick(entry.id, fixture.id, fixture.awayTeam)}
                                disabled={isLoading}
                                className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50"
                              >
                                {fixture.awayTeam}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex space-x-4">
        <a href={`/competition/${competition.id}/admin`} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
          Back to Admin
        </a>
        <a href={`/competition/${competition.id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Back to Competition
        </a>
      </div>
    </div>
  )
}
