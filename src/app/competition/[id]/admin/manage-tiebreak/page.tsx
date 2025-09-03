import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Gamepad2, Trophy, Clock } from 'lucide-react'

interface ManageTiebreakPageProps {
  params: Promise<{ id: string }>
}

export default async function ManageTiebreakPage({ params }: ManageTiebreakPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.email !== 'jonah@jkc.com') {
    redirect('/auth/signin')
  }

  const { id: competitionId } = await params

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      rounds: {
        where: { endedAt: null },
        include: {
          tiebreakParticipants: {
            include: {
              entry: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!competition) {
    notFound()
  }

  const currentRound = competition.rounds[0]

  if (!currentRound || (currentRound.tiebreakStatus !== 'pending' && currentRound.tiebreakStatus !== 'in_progress')) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link
            href={`/competition/${competitionId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Competition
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Manage Tiebreak</h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Gamepad2 className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">No Active Tiebreak</h2>
          <p className="text-yellow-700">
            There is currently no active Whomst tiebreak for this round.
          </p>
        </div>
      </div>
    )
  }

  const participants = currentRound.tiebreakParticipants
  const submittedCount = participants.filter(p => p.attemptUsed).length
  const totalCount = participants.length

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href={`/competition/${competitionId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Competition
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Manage Tiebreak</h1>
        <p className="text-gray-600 mt-2">
          Round {currentRound.roundNumber} - Stage {currentRound.tiebreakStage}
        </p>
      </div>

      {/* Tiebreak Status */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Gamepad2 className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-purple-900">Whomst Tiebreak</h2>
              <p className="text-purple-700">
                Status: {currentRound.tiebreakStatus === 'pending' ? 'Waiting for submissions' : 'In Progress'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {submittedCount}/{totalCount}
            </div>
            <div className="text-sm text-purple-600">Submissions</div>
          </div>
        </div>

        {currentRound.tiebreakDeadline && (
          <div className="flex items-center text-purple-700">
            <Clock className="w-4 h-4 mr-2" />
            <span>Deadline: {new Date(currentRound.tiebreakDeadline).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`p-4 rounded-lg border ${
                participant.attemptUsed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${
                    participant.attemptUsed ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    {participant.entry.user.name || participant.entry.user.email}
                  </h4>
                  <p className={`text-sm ${
                    participant.attemptUsed ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {participant.attemptUsed 
                      ? `Score: ${participant.score} (submitted ${new Date(participant.submittedAt!).toLocaleString()})`
                      : 'Pending submission'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl ${
                    participant.attemptUsed ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {participant.attemptUsed ? '✅' : '⏳'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results Summary */}
      {submittedCount > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Results</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {(() => {
              const submittedParticipants = participants.filter(p => p.attemptUsed)
              const sortedParticipants = submittedParticipants.sort((a, b) => (b.score || 0) - (a.score || 0))
              const maxScore = sortedParticipants[0]?.score || 0
              const topScorers = sortedParticipants.filter(p => p.score === maxScore)

              return (
                <div>
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Leaderboard:</h4>
                    <div className="space-y-2">
                      {sortedParticipants.map((participant, index) => (
                        <div
                          key={participant.id}
                          className={`flex items-center justify-between p-2 rounded ${
                            participant.score === maxScore ? 'bg-yellow-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900 mr-2">
                              {index + 1}.
                            </span>
                            <span className="text-gray-700">
                              {participant.entry.user.name || participant.entry.user.email}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900">
                            {participant.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {topScorers.length === 1 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Trophy className="w-6 h-6 text-green-600 mr-2" />
                        <div>
                          <h4 className="font-semibold text-green-900">Winner!</h4>
                          <p className="text-green-700">
                            {topScorers[0].entry.user.name || topScorers[0].entry.user.email} 
                            {' '}wins with a score of {topScorers[0].score}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : topScorers.length > 1 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Gamepad2 className="w-6 h-6 text-yellow-600 mr-2" />
                        <div>
                          <h4 className="font-semibold text-yellow-900">Tie Detected</h4>
                          <p className="text-yellow-700">
                            {topScorers.length} players tied with score {maxScore}. 
                            {submittedCount === totalCount 
                              ? &apos; A new tiebreak stage will be created automatically.&apos;
                              : &apos; Waiting for remaining submissions.&apos;
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Admin Actions</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Tiebreak will automatically conclude when all participants submit</p>
          <p>• If there's a tie, a new stage will be created for tied participants only</p>
          <p>• The deadline is set to the next gameweek lock time</p>
          <p>• Round winner will be determined automatically based on highest score</p>
        </div>
      </div>
    </div>
  )
}
