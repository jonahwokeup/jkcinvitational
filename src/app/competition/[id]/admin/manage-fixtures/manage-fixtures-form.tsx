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
}

interface Gameweek {
  id: string
  gameweekNumber: number
  fixtures: Fixture[]
}

interface ManageFixturesFormProps {
  competition: any
  gameweeks: Gameweek[]
}

export default function ManageFixturesForm({ competition, gameweeks }: ManageFixturesFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const moveFixture = async (fixtureId: string, newGameweekId: string) => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/competition/fixtures/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fixtureId,
          newGameweekId,
        }),
      })

      if (response.ok) {
        setMessage('Fixture moved successfully!')
        router.refresh()
      } else {
        const error = await response.text()
        setMessage(`Error: ${error}`)
      }
    } catch (error) {
      setMessage('Error moving fixture')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFixtureResult = async (fixtureId: string, homeGoals: number, awayGoals: number) => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/competition/fixtures/update-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fixtureId,
          homeGoals,
          awayGoals,
        }),
      })

      if (response.ok) {
        setMessage('Fixture result updated!')
        router.refresh()
      } else {
        const error = await response.text()
        setMessage(`Error: ${error}`)
      }
    } catch (error) {
      setMessage('Error updating fixture result')
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

      {gameweeks.map((gameweek) => (
        <div key={gameweek.id} className="bg-white/5 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-white mb-4">
            Gameweek {gameweek.gameweekNumber} ({gameweek.fixtures.length} fixtures)
          </h2>
          
          <div className="space-y-3">
            {gameweek.fixtures.map((fixture) => (
              <div key={fixture.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {fixture.homeTeam} v {fixture.awayTeam}
                  </div>
                  <div className="text-green-200 text-sm">
                    {new Date(fixture.kickoff).toLocaleDateString()} - {fixture.status}
                  </div>
                  {fixture.homeGoals !== null && fixture.awayGoals !== null && (
                    <div className="text-yellow-300 font-bold">
                      {fixture.homeGoals} - {fixture.awayGoals}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {/* Move to different gameweek */}
                  <select
                    className="bg-white/20 text-white rounded px-2 py-1 text-sm"
                    onChange={(e) => {
                      if (e.target.value && e.target.value !== gameweek.id) {
                        moveFixture(fixture.id, e.target.value)
                      }
                    }}
                    disabled={isLoading}
                  >
                    <option value="">Move to...</option>
                    {gameweeks.map((gw) => (
                      <option key={gw.id} value={gw.id}>
                        GW{gw.gameweekNumber}
                      </option>
                    ))}
                  </select>

                  {/* Update result */}
                  {fixture.status === 'SCHEDULED' && (
                    <button
                      onClick={() => {
                        const homeGoals = prompt(`Enter ${fixture.homeTeam} goals:`)
                        const awayGoals = prompt(`Enter ${fixture.awayTeam} goals:`)
                        if (homeGoals && awayGoals) {
                          updateFixtureResult(fixture.id, parseInt(homeGoals), parseInt(awayGoals))
                        }
                      }}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Set Result
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-8 flex space-x-4">
        <a
          href={`/competition/${competition.id}/admin`}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Admin
        </a>
        <a
          href={`/competition/${competition.id}`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Back to Competition
        </a>
      </div>
    </div>
  )
}
