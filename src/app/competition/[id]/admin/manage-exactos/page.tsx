import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Target, Users, Calendar } from 'lucide-react'
import AdminExactoForm from './admin-exacto-form'

interface ManageExactosPageProps {
  params: Promise<{ id: string }>
}

export default async function ManageExactosPage({ params }: ManageExactosPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id: competitionId } = await params

  // Get competition and verify admin access
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      entries: {
        include: {
          user: true,
          exactoPredictions: {
            include: {
              gameweek: true,
                    fixture: true
            },
            orderBy: { gameweek: { gameweekNumber: 'desc' } }
          }
        }
      },
      gameweeks: {
        orderBy: { gameweekNumber: 'desc' },
        include: {
          fixtures: true
        }
      }
    }
  })

  if (!competition) {
    notFound()
  }

  // Check if user is admin (Jonah)
  const isAdmin = session.user.email === 'jonah@jkc.com'
  if (!isAdmin) {
    redirect(`/competition/${competitionId}`)
  }

  // Get current round
  const currentRound = await prisma.round.findFirst({
    where: {
      competitionId,
      endedAt: null
    },
    include: {
      entries: {
        include: {
          user: true
        }
      }
    }
  })

  // Get all Exacto predictions
  const allExactoPredictions = await prisma.exactoPrediction.findMany({
    where: {
      entry: {
        competitionId
      }
    },
    include: {
      entry: {
        include: {
          user: true
        }
      },
      gameweek: true,
      fixture: true
    },
    orderBy: [
      { gameweek: { gameweekNumber: 'desc' } },
      { createdAt: 'desc' }
    ]
  })

  // Group predictions by gameweek
  const predictionsByGameweek = allExactoPredictions.reduce((acc, prediction) => {
    const gwNumber = prediction.gameweek.gameweekNumber
    if (!acc[gwNumber]) {
      acc[gwNumber] = []
    }
    acc[gwNumber].push(prediction)
    return acc
  }, {} as Record<number, typeof allExactoPredictions>)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href={`/competition/${competitionId}`}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Competition</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Exactos</h1>
              <p className="text-gray-600">{competition.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Exactos</p>
                <p className="text-2xl font-bold text-gray-900">{allExactoPredictions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Players</p>
                <p className="text-2xl font-bold text-gray-900">
                  {competition.entries.filter(e => e.livesRemaining > 0).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Current Round</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentRound?.roundNumber || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Exacto Management */}
        <div className="mb-8">
          <AdminExactoForm
            competitionId={competitionId}
            entries={competition.entries}
            gameweeks={competition.gameweeks}
            existingPredictions={allExactoPredictions}
            onPredictionChange={() => {
              // The component will handle refreshing via router.refresh()
            }}
          />
        </div>

        {/* Exacto Predictions by Gameweek */}
        <div className="space-y-6">
          {Object.entries(predictionsByGameweek).map(([gameweekNumber, predictions]) => (
            <div key={gameweekNumber} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Gameweek {gameweekNumber} Exactos
                </h2>
                <p className="text-sm text-gray-600">
                  {predictions.length} prediction{predictions.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {predictions.map((prediction) => (
                    <div
                      key={prediction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {prediction.entry.user.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {prediction.entry.user.email}
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Predicted</p>
                            <p className="font-semibold text-gray-900">
                              {prediction.fixture.homeTeam} {prediction.homeGoals} - {prediction.awayGoals} {prediction.fixture.awayTeam}
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Status</p>
                            <p className={`font-medium ${
                              prediction.isCorrect === null 
                                ? 'text-yellow-600' 
                                : prediction.isCorrect 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                            }`}>
                              {prediction.isCorrect === null 
                                ? 'Pending' 
                                : prediction.isCorrect 
                                  ? 'Correct' 
                                  : 'Incorrect'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(prediction.createdAt).toLocaleDateString()}
                        </p>
                        {prediction.updatedAt !== prediction.createdAt && (
                          <p className="text-sm text-gray-600">
                            Updated: {new Date(prediction.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {allExactoPredictions.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Exacto Predictions</h3>
            <p className="text-gray-600">
              No players have submitted Exacto predictions yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
