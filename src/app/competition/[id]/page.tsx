import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatTimeUntil, isBeforeLock } from '@/lib/utils'
import { Trophy, Users, Clock, Calendar, Target, LogOut, Settings } from 'lucide-react'
import CompetitionHeader from '@/components/competition-header'
import TeamCrest from '@/components/team-crest'
import type { Session } from 'next-auth'

interface CompetitionPageProps {
  params: Promise<{ id: string }>
}

export default async function CompetitionPage({ params }: CompetitionPageProps) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id: competitionId } = await params
  
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      rounds: {
        where: { endedAt: null },
        include: {
          entries: {
            include: {
              user: true,
              picks: {
                include: {
                  gameweek: true,
                  fixture: true,
                },
              },
            },
          },
        },
      },
      gameweeks: {
        where: { lockTime: { gt: new Date() } },
        orderBy: { lockTime: 'asc' },
        take: 1,
        include: {
          fixtures: {
            orderBy: { kickoff: 'asc' }
          }
        }
      },
    },
  })

  if (!competition) {
    notFound()
  }

  const currentRound = competition.rounds[0]
  const nextGameweek = competition.gameweeks[0]
  const aliveEntries = currentRound?.entries.filter((entry: any) => entry.livesRemaining > 0) || []
  const eliminatedEntries = currentRound?.entries.filter((entry: any) => entry.livesRemaining <= 0) || []

  const isLocked = nextGameweek ? !isBeforeLock(nextGameweek.fixtures && nextGameweek.fixtures.length > 0 ? nextGameweek.fixtures[0].kickoff : nextGameweek.lockTime) : false

  const getUserPlaceholder = (name: string) => {
    const initials = name.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()
    return (
      <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center font-semibold">
        {initials}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <CompetitionHeader 
          competitionName={competition.name}
          season={competition.season}
          inviteCode={competition.inviteCode}
        />

        {/* Current Round Status */}
        {currentRound && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Round {currentRound.roundNumber}
              </h2>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{aliveEntries.length}</div>
                  <div className="text-sm text-gray-600">Survivors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{eliminatedEntries.length}</div>
                  <div className="text-sm text-gray-600">Eliminated</div>
                </div>
              </div>
            </div>

            {/* Next Gameweek */}
            {nextGameweek && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-1">
                      Gameweek {nextGameweek.gameweekNumber}
                    </h3>
                    <p className="text-blue-700">
                      First match starts {formatTimeUntil(nextGameweek.fixtures && nextGameweek.fixtures.length > 0 ? nextGameweek.fixtures[0].kickoff : nextGameweek.lockTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    {isBeforeLock(nextGameweek.fixtures && nextGameweek.fixtures.length > 0 ? nextGameweek.fixtures[0].kickoff : nextGameweek.lockTime) ? (
                      <Link
                        href={`/competition/${competition.id}/pick`}
                        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Make Pick
                      </Link>
                    ) : (
                      <span className="px-4 py-2 bg-red-100 text-red-800 font-medium rounded-lg">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* User's Current Pick */}
            {nextGameweek && (
              (() => {
                const userEntry = aliveEntries.find((entry: any) => entry.user.id === session.user!.id)
                if (!userEntry) return null
                
                const currentPick = userEntry.picks.find((pick: any) => pick.gameweekId === nextGameweek.id)
                if (!currentPick) return null
                
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Your Pick for Gameweek {nextGameweek.gameweekNumber}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <TeamCrest teamName={currentPick.team} size="lg" />
                        <span className="text-sm text-green-700">
                          (vs {currentPick.fixture?.homeTeam === currentPick.team ? currentPick.fixture?.awayTeam : currentPick.fixture?.homeTeam})
                        </span>
                      </div>
                      {isBeforeLock(nextGameweek.lockTime) && (
                        <Link
                          href={`/competition/${competition.id}/pick`}
                          className="text-sm text-green-700 hover:text-green-900 underline"
                        >
                          Change Pick
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })()
            )}

            {/* Survivors */}
            {aliveEntries.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  Survivors ({aliveEntries.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {aliveEntries.map((entry: any) => {
                    const lastPick = entry.picks[entry.picks.length - 1]
                    const showCrest = isLocked
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-green-900">
                            {entry.user.name || entry.user.email}
                          </p>
                          <p className="text-sm text-green-700">
                            {entry.picks.length} picks made
                          </p>
                          {lastPick && (
                            <div className="mt-1">
                              {showCrest ? (
                                <TeamCrest teamName={lastPick.team} size="sm" />
                              ) : (
                                getUserPlaceholder(entry.user.name || entry.user.email)
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {entry.livesRemaining}
                          </div>
                          <div className="text-xs text-green-600">lives</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Eliminated */}
            {eliminatedEntries.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-red-600" />
                  Eliminated ({eliminatedEntries.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {eliminatedEntries.map((entry: any) => {
                    const lastPick = entry.picks[entry.picks.length - 1]
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-red-900">
                            {entry.user.name || entry.user.email}
                          </p>
                          <p className="text-sm text-red-700">
                            Eliminated GW {entry.eliminatedAtGw}
                          </p>
                          {lastPick && (
                            <div className="mt-1">
                              <TeamCrest teamName={lastPick.team} size="sm" />
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">0</div>
                          <div className="text-xs text-red-600">lives</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href={`/competition/${competition.id}/pick`}
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
          >
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Make Pick</h3>
            <p className="text-gray-600">Choose your team for this gameweek</p>
          </Link>

          <Link
            href={`/competition/${competition.id}/results`}
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
          >
            <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Results</h3>
            <p className="text-gray-600">View gameweek results and history</p>
          </Link>

          <Link
            href={`/competition/${competition.id}/leaderboard`}
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
          >
            <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Leaderboard</h3>
            <p className="text-gray-600">Season standings and statistics</p>
          </Link>
        </div>

        {/* Admin Navigation - Only for Jonah McGowan */}
        {session.user.email === 'jonah@jkc.com' && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Tools</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href={`/competition/${competition.id}/admin`}
                className="block p-6 bg-purple-50 rounded-lg shadow-sm border border-purple-200 hover:shadow-md transition-shadow text-center"
              >
                <Settings className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-purple-900 mb-1">Admin Panel</h3>
                <p className="text-purple-700">Manage competition settings and results</p>
              </Link>

              <Link
                href={`/competition/${competition.id}/admin/manage-fixtures`}
                className="block p-6 bg-orange-50 rounded-lg shadow-sm border border-orange-200 hover:shadow-md transition-shadow text-center"
              >
                <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-orange-900 mb-1">Manage Fixtures</h3>
                <p className="text-orange-700">Organize fixtures into correct gameweeks</p>
              </Link>

              <Link
                href={`/competition/${competition.id}/admin/manage-picks`}
                className="block p-6 bg-teal-50 rounded-lg shadow-sm border border-teal-200 hover:shadow-md transition-shadow text-center"
              >
                <Users className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-teal-900 mb-1">Manage Picks</h3>
                <p className="text-teal-700">View and edit user picks</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
