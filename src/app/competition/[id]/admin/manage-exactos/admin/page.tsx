"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AdminExactoForm from '../admin-exacto-form'

interface User {
  id: string
  name: string | null
  email: string
}

interface Entry {
  id: string
  userId: string
  user: User
  livesRemaining: number
}

interface Gameweek {
  id: string
  gameweekNumber: number
  lockTime: Date
  isSettled: boolean
}

interface Fixture {
  id: string
  homeTeam: string
  awayTeam: string
  kickoff: Date
  homeGoals: number | null
  awayGoals: number | null
  status: string
}

interface ExactoPrediction {
  id: string
  entryId: string
  gameweekId: string
  fixtureId: string
  homeGoals: number
  awayGoals: number
  isCorrect: boolean | null
  createdAt: Date
  updatedAt: Date
  entry: Entry
  gameweek: Gameweek
  fixture: Fixture
}

export default function AdminExactoPage() {
  const params = useParams()
  const competitionId = params.id as string
  
  const [entries, setEntries] = useState<Entry[]>([])
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [existingPredictions, setExistingPredictions] = useState<ExactoPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [competitionId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load competition data
      const response = await fetch(`/api/competition/${competitionId}/admin-data`)
      const data = await response.json()
      
      if (data.success) {
        setEntries(data.entries || [])
        setGameweeks(data.gameweeks || [])
        setExistingPredictions(data.existingPredictions || [])
      } else {
        setError(data.error || 'Failed to load data')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const handlePredictionChange = () => {
    loadData() // Reload data when predictions change
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin exacto management...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <AdminExactoForm
          competitionId={competitionId}
          entries={entries}
          gameweeks={gameweeks}
          existingPredictions={existingPredictions}
          onPredictionChange={handlePredictionChange}
        />
      </div>
    </div>
  )
}
