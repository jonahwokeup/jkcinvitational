import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import TeamCrest from '@/components/team-crest'
import type { Session } from 'next-auth'

interface ResultsPageProps {
  params: Promise<{ id: string }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const session = await getServerSession(authOptions) as Session | null
  
  // Make results page viewable for all users (no sign-in requirement)
  // if (!session?.user?.id) {
  //   redirect('/auth/signin')
  // }

  const { id: competitionId } = await params
  
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      gameweeks: {
        include: {
          fixtures: {
            include: {
              picks: {
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
        },
        orderBy: { gameweekNumber: 'desc' }
      },
      entries: {
        include: {
          user: true,
          picks: {
            include: {
              fixture: true
            }
          }
        }
      }
    }
  })

  if (!competition) {
    notFound()
  }

  // Public page: do not require membership in competition
  // const userEntry = competition.entries.find(entry => entry.userId === session?.user?.id)
  // if (!userEntry) {
  //   redirect(`/competition/${competition.id}`)
  // }

  // Order: settled (or in-progress) first, newest to oldest; then purely scheduled GWs ascending
  const settledFirst = competition.gameweeks
    .filter(gw => gw.isSettled || gw.fixtures.some(f => f.status === 'FINISHED'))
    .sort((a, b) => b.gameweekNumber - a.gameweekNumber)

  const scheduledLater = competition.gameweeks
    .filter(gw => !gw.isSettled && gw.fixtures.every(f => f.status === 'SCHEDULED'))
    .sort((a, b) => a.gameweekNumber - b.gameweekNumber)

  const orderedGameweeks = [...settledFirst, ...scheduledLater]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Results</h1>
              <p className="text-gray-600">{competition.name} - {competition.season}</p>
            </div>
            <Link
              href={`/competition/${competition.id}`}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* All Gameweek Results */}
        <div className="space-y-6">
          {orderedGameweeks
            .map(gameweek => (
              <div key={gameweek.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className={`px-6 py-4 border-b border-gray-200 ${
                  gameweek.isSettled ? 'bg-green-50' : gameweek.fixtures.some(f => f.status === 'FINISHED') ? 'bg-blue-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Gameweek {gameweek.gameweekNumber}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {gameweek.isSettled 
                          ? `Settled on ${formatDate(gameweek.settledAt!, "PPp")}`
                          : `Status: ${gameweek.fixtures.some(f => f.status === 'FINISHED') ? 'In Progress' : 'Scheduled'}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        gameweek.isSettled 
                          ? 'bg-green-100 text-green-800' 
                          : gameweek.fixtures.some(f => f.status === 'FINISHED')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {gameweek.isSettled ? 'Completed' : gameweek.fixtures.some(f => f.status === 'FINISHED') ? 'In Progress' : 'Scheduled'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {gameweek.fixtures.map(fixture => (
                    <div key={fixture.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <TeamCrest teamName={fixture.homeTeam} size="md" />
                          <div className="text-center">
                            {fixture.status === 'FINISHED' ? (
                              <>
                                <div className="text-2xl font-bold text-gray-900">
                                  {fixture.homeGoals} - {fixture.awayGoals}
                                </div>
                                <div className="text-sm text-gray-500">Final Score</div>
                              </>
                            ) : fixture.status === 'SCHEDULED' ? (
                              <>
                                <div className="text-lg font-medium text-gray-500">vs</div>
                                <div className="text-sm text-gray-400">Scheduled</div>
                              </>
                            ) : (
                              <>
                                <div className="text-lg font-medium text-gray-500">vs</div>
                                <div className="text-sm text-gray-400">{fixture.status}</div>
                              </>
                            )}
                          </div>
                          <TeamCrest teamName={fixture.awayTeam} size="md" />
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {formatDate(fixture.kickoff, "PPp")}
                          </div>
                          {fixture.picks.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">Picks:</div>
                              {fixture.picks.map(pick => (
                                <div key={pick.id} className="text-sm">
                                  <span className="font-medium">{pick.entry.user.name}</span>
                                  <span className="text-gray-500"> picked </span>
                                  <span className="font-medium">{pick.team}</span>
                                  {fixture.status === 'FINISHED' && (
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                      pick.team === fixture.homeTeam 
                                        ? (fixture.homeGoals! > fixture.awayGoals! ? 'bg-green-100 text-green-800' : 
                                           fixture.homeGoals! === fixture.awayGoals! ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')
                                        : (fixture.awayGoals! > fixture.homeGoals! ? 'bg-green-100 text-green-800' : 
                                           fixture.awayGoals! === fixture.homeGoals! ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')
                                    }`}>
                                      {pick.team === fixture.homeTeam 
                                        ? (fixture.homeGoals! > fixture.awayGoals! ? 'WIN' : 
                                           fixture.homeGoals! === fixture.awayGoals! ? 'DRAW' : 'LOSS')
                                        : (fixture.awayGoals! > fixture.homeGoals! ? 'WIN' : 
                                           fixture.awayGoals! === fixture.homeGoals! ? 'DRAW' : 'LOSS')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          
          {competition.gameweeks.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No active gameweeks available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
