"use client"

import { useState, useEffect, useCallback } from 'react'
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
  lockTime: string
  isSettled: boolean
}

interface Fixture {
  id: string
  homeTeam: string
  awayTeam: string
  kickoff: string
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
  createdAt: string
  updatedAt: string
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Loading admin data for competition:', competitionId)
      
      // Load competition data
      const response = await fetch(`/api/competition/${competitionId}/admin-data`)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        setEntries(data.entries || [])
        setGameweeks(data.gameweeks || [])
        setExistingPredictions(data.existingPredictions || [])
      } else {
        setError(data.error || 'Failed to load data')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [competitionId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePredictionChange = () => {
    loadData() // Reload data when predictions change
  }

  // Add error boundary for missing competition ID
  if (!competitionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">Competition ID is missing</p>
        </div>
      </div>
    )
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Exacto Management</h1>
          <p className="text-gray-600">Manage exacto predictions for any user in the competition.</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <AdminExactoForm
            competitionId={competitionId}
            entries={entries}
            gameweeks={gameweeks}
            existingPredictions={existingPredictions}
            onPredictionChange={handlePredictionChange}
          />
        </div>
      </div>
    </div>
  )
}
