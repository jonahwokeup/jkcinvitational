"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

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

interface AdminExactoFormProps {
  competitionId: string
  entries: Entry[]
  gameweeks: Gameweek[]
  existingPredictions: ExactoPrediction[]
  onPredictionChange: () => void
}

export default function AdminExactoForm({ 
  competitionId, 
  entries, 
  gameweeks, 
  existingPredictions,
  onPredictionChange 
}: AdminExactoFormProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState('')
  const [selectedGameweek, setSelectedGameweek] = useState('')
  const [selectedFixture, setSelectedFixture] = useState('')
  const [homeGoals, setHomeGoals] = useState('')
  const [awayGoals, setAwayGoals] = useState('')
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadFixtures = useCallback(async (gameweekId: string) => {
    try {
      const response = await fetch(`/api/competition/fixtures?gameweekId=${gameweekId}&competitionId=${competitionId}`)
      const data = await response.json()
      
      if (data.success) {
        setFixtures(data.fixtures || [])
      } else {
        setError('Failed to load fixtures')
      }
    } catch (error) {
      console.error('Error loading fixtures:', error)
      setError('Error loading fixtures')
    }
  }, [competitionId])

  // Load fixtures when gameweek changes
  useEffect(() => {
    if (selectedGameweek) {
      loadFixtures(selectedGameweek)
    }
  }, [selectedGameweek, loadFixtures])

  // Add error boundary for the component
  if (!competitionId) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: Competition ID is missing</p>
      </div>
    )
  }

  const resetForm = () => {
    setSelectedEntry('')
    setSelectedGameweek('')
    setSelectedFixture('')
    setHomeGoals('')
    setAwayGoals('')
    setFixtures([])
    setError('')
    setSuccess('')
  }

  const startAdding = () => {
    resetForm()
    setIsAdding(true)
    setEditingId(null)
  }

  const startEditing = (prediction: ExactoPrediction) => {
    setSelectedEntry(prediction.entryId)
    setSelectedGameweek(prediction.gameweekId)
    setSelectedFixture(prediction.fixtureId)
    setHomeGoals(prediction.homeGoals.toString())
    setAwayGoals(prediction.awayGoals.toString())
    setEditingId(prediction.id)
    setIsAdding(true)
    setError('')
    setSuccess('')
  }

  const cancelEditing = () => {
    resetForm()
    setIsAdding(false)
    setEditingId(null)
  }

  const submitPrediction = async () => {
    if (!selectedEntry || !selectedGameweek || !selectedFixture || !homeGoals || !awayGoals) {
      setError('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const url = editingId 
        ? `/api/admin/exacto/${editingId}`
        : `/api/admin/exacto`
      
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId: selectedEntry,
          gameweekId: selectedGameweek,
          fixtureId: selectedFixture,
          homeGoals: parseInt(homeGoals),
          awayGoals: parseInt(awayGoals),
          competitionId
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(editingId ? 'Exacto updated successfully!' : 'Exacto created successfully!')
        onPredictionChange()
        router.refresh()
        setTimeout(() => {
          cancelEditing()
        }, 1500)
      } else {
        setError(data.error || 'Failed to save exacto prediction')
      }
    } catch (error) {
      console.error('Error saving exacto:', error)
      setError('Error saving exacto prediction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deletePrediction = async (predictionId: string) => {
    if (!confirm('Are you sure you want to delete this exacto prediction?')) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/exacto/${predictionId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess('Exacto deleted successfully!')
        onPredictionChange()
        router.refresh()
        setTimeout(() => setSuccess(''), 1500)
      } else {
        setError(data.error || 'Failed to delete exacto prediction')
      }
    } catch (error) {
      console.error('Error deleting exacto:', error)
      setError('Error deleting exacto prediction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPredictionStatus = (prediction: ExactoPrediction) => {
    if (prediction.isCorrect === null) return 'Pending'
    return prediction.isCorrect ? 'Correct' : 'Incorrect'
  }

  const getStatusColor = (prediction: ExactoPrediction) => {
    if (prediction.isCorrect === null) return 'text-yellow-600'
    return prediction.isCorrect ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Admin Exacto Management</h3>
          <button
            onClick={startAdding}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Exacto</span>
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Competition ID: {competitionId} | Entries: {entries.length} | Gameweeks: {gameweeks.length}
        </div>
      </div>

      <div className="p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {isAdding && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {editingId ? 'Edit Exacto Prediction' : 'Add New Exacto Prediction'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User
                </label>
                <select
                  value={selectedEntry}
                  onChange={(e) => setSelectedEntry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a user</option>
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.user.name || 'Unknown User'} ({entry.user.email}) - {entry.livesRemaining} lives
                    </option>
                  ))}
                </select>
              </div>

              {/* Gameweek Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gameweek
                </label>
                <select
                  value={selectedGameweek}
                  onChange={(e) => setSelectedGameweek(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a gameweek</option>
                  {gameweeks.map((gw) => (
                    <option key={gw.id} value={gw.id}>
                      GW{gw.gameweekNumber} - {new Date(gw.lockTime).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fixture Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fixture
                </label>
                <select
                  value={selectedFixture}
                  onChange={(e) => setSelectedFixture(e.target.value)}
                  disabled={!selectedGameweek}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select a fixture</option>
                  {fixtures.map((fixture) => (
                    <option key={fixture.id} value={fixture.id}>
                      {fixture.homeTeam} vs {fixture.awayTeam}
                    </option>
                  ))}
                </select>
              </div>

              {/* Goals Input */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Home Goals
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
                    Away Goals
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
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitPrediction}
                disabled={isSubmitting || !selectedEntry || !selectedGameweek || !selectedFixture || !homeGoals || !awayGoals}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Existing Predictions */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Existing Exacto Predictions</h4>
          
          {existingPredictions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No exacto predictions found.</p>
          ) : (
            <div className="space-y-3">
              {existingPredictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {prediction.entry.user.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {prediction.entry.user.email}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">GW{prediction.gameweek.gameweekNumber}</p>
                        <p className="font-semibold text-gray-900">
                          {prediction.fixture.homeTeam} {prediction.homeGoals} - {prediction.awayGoals} {prediction.fixture.awayTeam}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Status</p>
                        <p className={`font-medium ${getStatusColor(prediction)}`}>
                          {getPredictionStatus(prediction)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditing(prediction)}
                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePrediction(prediction.id)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
