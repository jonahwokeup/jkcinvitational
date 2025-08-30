import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Trophy, Medal, Crown, Users, Calendar } from 'lucide-react'
import type { Session } from 'next-auth'

interface LeaderboardPageProps {
  params: Promise<{ id: string }>
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id: competitionId } = await params
  
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      entries: {
        include: {
          user: true,
          picks: {
            include: {
              gameweek: true
            }
          },
          round: true
        },
        orderBy: [
          { seasonRoundWins: 'desc' },
          { firstRoundWinAt: 'asc' },
          { seasonMissedPicks: 'asc' },
        ],
      },
      seasonChampion: {
        include: {
          user: true,
        },
      },
    },
  })

  if (!competition) {
    notFound()
  }

  // Calculate gameweeks survived for each entry (only count settled gameweeks)
  const entriesWithStats = competition.entries.map(entry => {
    const settledPicks = entry.picks.filter(pick => pick.gameweek.isSettled);
    const uniqueSettledGameweeks = new Set(settledPicks.map(pick => pick.gameweek.gameweekNumber));
    return {
      ...entry,
      calculatedGwsSurvived: uniqueSettledGameweeks.size
    };
  });

  // Re-sort entries based on calculated stats
  entriesWithStats.sort((a, b) => {
    if (a.seasonRoundWins !== b.seasonRoundWins) {
      return b.seasonRoundWins - a.seasonRoundWins;
    }
    if (a.calculatedGwsSurvived !== b.calculatedGwsSurvived) {
      return b.calculatedGwsSurvived - a.calculatedGwsSurvived;
    }
    if (a.firstRoundWinAt && b.firstRoundWinAt) {
      return new Date(a.firstRoundWinAt).getTime() - new Date(b.firstRoundWinAt).getTime();
    }
    return a.seasonMissedPicks - b.seasonMissedPicks;
  });

  const entries = entriesWithStats;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Season Leaderboard</h1>
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

        {/* Season Champion */}
        {competition.seasonChampion && (
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 mb-8 text-center">
            <Crown className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Season Champion</h2>
            <p className="text-xl text-white mb-1">
              {competition.seasonChampion.user.name || competition.seasonChampion.user.email}
            </p>
            <p className="text-yellow-100">
              {competition.seasonChampion.seasonRoundWins} round wins
            </p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Standings</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round Wins
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GWs Survived
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Missed Picks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Win
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eliminations
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry, index) => {
                  const isCurrentUser = entry.userId === session.user!.id
                  const isChampion = competition.seasonChampion?.id === entry.id
                  
                  return (
                    <tr
                      key={entry.id}
                      className={`${
                        isCurrentUser ? 'bg-blue-50' : ''
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && (
                            <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                          )}
                          {index === 1 && (
                            <Medal className="w-5 h-5 text-gray-400 mr-2" />
                          )}
                          {index === 2 && (
                            <Medal className="w-5 h-5 text-orange-500 mr-2" />
                          )}
                          <span className={`text-sm font-medium ${
                            isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className={`text-sm font-medium ${
                              isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {entry.user.name || entry.user.email}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                              {isChampion && (
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  Champion
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {entry.seasonRoundWins}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {entry.calculatedGwsSurvived}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {entry.seasonMissedPicks}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {entry.firstRoundWinAt 
                            ? formatDate(entry.firstRoundWinAt, "MMM d")
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {entry.eliminatedAtGw ? 1 : 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          entry.livesRemaining > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.livesRemaining > 0 ? '✅' : '❌'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Players</p>
                <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rounds</p>
                <p className="text-2xl font-bold text-gray-900">
                  {entries.reduce((sum, entry) => sum + entry.seasonRoundWins, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Season Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {competition.isActive ? 'Active' : 'Ended'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
