"use client"

import { useState } from 'react'
import { formatDate } from '@/lib/utils'

interface ManageExactosFormProps {
  competition: any
  rounds: any[]
}

export default function ManageExactosForm({ competition, rounds }: ManageExactosFormProps) {
  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || '')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'correct' | 'incorrect'>('all')

  const currentRound = rounds.find(r => r.id === selectedRound)
  const allExactos = currentRound?.entries.flatMap((entry: any) => 
    entry.exactoPredictions.map((prediction: any) => ({
      ...prediction,
      user: entry.user,
      entry: entry
    }))
  ) || []

  const filteredExactos = allExactos.filter((exacto: any) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') return exacto.isCorrect === null
    if (filterStatus === 'correct') return exacto.isCorrect === true
    if (filterStatus === 'incorrect') return exacto.isCorrect === false
    return true
  })

  const getStatusBadge = (exacto: any) => {
    if (exacto.isCorrect === null) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
    }
    if (exacto.isCorrect === true) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Correct</span>
    }
    return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Incorrect</span>
  }

  const getStatusColor = (exacto: any) => {
    if (exacto.isCorrect === null) return 'text-yellow-600'
    if (exacto.isCorrect === true) return 'text-green-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Round Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Select Round</h3>
        <select
          value={selectedRound}
          onChange={(e) => setSelectedRound(e.target.value)}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {rounds.map((round) => (
            <option key={round.id} value={round.id} className="bg-gray-800 text-white">
              Round {round.roundNumber}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Controls */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Filter by Status</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All', color: 'bg-gray-500' },
            { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
            { value: 'correct', label: 'Correct', color: 'bg-green-500' },
            { value: 'incorrect', label: 'Incorrect', color: 'bg-red-500' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value as any)}
              className={`px-3 py-1 rounded-full text-white text-sm transition-colors ${
                filterStatus === filter.value 
                  ? filter.color 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exacto Listings */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Exacto Predictions ({filteredExactos.length})
          </h3>
          <div className="text-sm text-white/70">
            Round {currentRound?.roundNumber}
          </div>
        </div>

        {filteredExactos.length === 0 ? (
          <div className="text-center py-8 text-white/70">
            <p>No Exacto predictions found for the selected criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExactos.map((exacto: any) => (
              <div
                key={exacto.id}
                className="bg-white/10 rounded-lg p-4 border border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-white">
                        {exacto.user.name || exacto.user.email}
                      </h4>
                      {getStatusBadge(exacto)}
                      {exacto.entry.usedExacto && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          Used
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/70">Fixture:</span>
                        <div className="text-white font-medium">
                          {exacto.fixture.homeTeam} vs {exacto.fixture.awayTeam}
                        </div>
                        <div className="text-white/70 text-xs">
                          {formatDate(exacto.fixture.kickoff, "PPp")}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-white/70">Prediction:</span>
                        <div className="text-white font-medium">
                          {exacto.homeScore} - {exacto.awayScore}
                        </div>
                        <div className="text-white/70 text-xs">
                          Submitted: {formatDate(exacto.createdAt, "PPp")}
                        </div>
                      </div>
                    </div>

                    {/* Result Display */}
                    {exacto.fixture.status === 'FINISHED' && exacto.fixture.homeGoals !== null && exacto.fixture.awayGoals !== null && (
                      <div className="mt-3 p-3 bg-white/5 rounded border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white/70 text-sm">Actual Result:</span>
                            <div className="text-white font-medium">
                              {exacto.fixture.homeTeam} {exacto.fixture.homeGoals} - {exacto.fixture.awayGoals} {exacto.fixture.awayTeam}
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${getStatusColor(exacto)}`}>
                            {exacto.isCorrect === true ? '✅' : exacto.isCorrect === false ? '❌' : '⏳'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Entry Status */}
                    <div className="mt-3 text-xs text-white/70">
                      <span>Entry Status: </span>
                      <span className={exacto.entry.livesRemaining > 0 ? 'text-green-400' : 'text-red-400'}>
                        {exacto.entry.livesRemaining > 0 ? 'Alive' : 'Eliminated'}
                      </span>
                      {exacto.entry.eliminatedAtGw && (
                        <span className="ml-2">
                          (Eliminated GW{exacto.entry.eliminatedAtGw})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Round Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{allExactos.length}</div>
            <div className="text-sm text-white/70">Total Exactos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {allExactos.filter((e: any) => e.isCorrect === null).length}
            </div>
            <div className="text-sm text-white/70">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {allExactos.filter((e: any) => e.isCorrect === true).length}
            </div>
            <div className="text-sm text-white/70">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {allExactos.filter((e: any) => e.isCorrect === false).length}
            </div>
            <div className="text-sm text-white/70">Incorrect</div>
          </div>
        </div>
      </div>
    </div>
  )
}
