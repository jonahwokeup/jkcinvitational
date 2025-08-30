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
              gameweek: true,
              fixture: true
            }
          },
          round: true
        },
      },
      gameweeks: {
        include: {
          fixtures: {
            include: {
              picks: true
            }
          }
        },
        orderBy: {
          gameweekNumber: 'asc'
        }
      }
    },
  })

  if (!competition) {
    notFound()
  }

  // Calculate real-time stats for each entry
  const entriesWithStats = competition.entries.map(entry => {
    // Count GWs survived (including current GWs where picks have won)
    let gwsSurvived = 0;
    const gameweekResults = new Map<number, boolean>();
    
    entry.picks.forEach(pick => {
      const gameweekNumber = pick.gameweek.gameweekNumber;
      const fixture = pick.fixture;
      
      if (fixture.status === "FINISHED") {
        // Check if this pick won
        const isWin = (pick.team === fixture.homeTeam && fixture.homeGoals! > fixture.awayGoals!) ||
                     (pick.team === fixture.awayTeam && fixture.awayGoals! > fixture.homeGoals!);
        
        if (isWin) {
          gameweekResults.set(gameweekNumber, true);
        } else {
          gameweekResults.set(gameweekNumber, false);
        }
      }
    });
    
    // Count unique gameweeks where the user survived
    gwsSurvived = gameweekResults.size;
    
    // Count eliminations (gameweeks where user lost)
    const eliminations = Array.from(gameweekResults.values()).filter(result => !result).length;
    
    // Check if currently eliminated
    const isEliminated = entry.livesRemaining <= 0;
    
    return {
      ...entry,
      calculatedGwsSurvived: gwsSurvived,
      eliminations,
      isEliminated
    };
  });

  // Sort entries by GWs survived, then by round wins, then by creation time
  entriesWithStats.sort((a, b) => {
    if (a.calculatedGwsSurvived !== b.calculatedGwsSurvived) {
      return b.calculatedGwsSurvived - a.calculatedGwsSurvived;
    }
    if (a.seasonRoundWins !== b.seasonRoundWins) {
      return b.seasonRoundWins - a.seasonRoundWins;
    }
    // If still tied, use creation time (earlier entry wins)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Handle ties - assign same position to players with identical records
  const entriesWithPositions = entriesWithStats.map((entry, index) => {
    let position = index + 1;
    
    if (index > 0) {
      const prevEntry = entriesWithStats[index - 1];
      if (prevEntry.calculatedGwsSurvived === entry.calculatedGwsSurvived &&
          prevEntry.seasonRoundWins === entry.seasonRoundWins) {
        // Find the first entry with these same stats
        const firstIndex = entriesWithStats.findIndex(e => 
          e.calculatedGwsSurvived === entry.calculatedGwsSurvived && 
          e.seasonRoundWins === entry.seasonRoundWins
        );
        position = firstIndex + 1;
      }
    }
    
    return {
      ...entry,
      position
    };
  });

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
                    GWs Survived
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round Wins
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
                {entriesWithPositions.map((entry) => {
                  const isCurrentUser = entry.userId === session.user!.id
                  
                  return (
                    <tr
                      key={entry.id}
                      className={`${
                        isCurrentUser ? 'bg-blue-50' : ''
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {entry.position === 1 && (
                            <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                          )}
                          {entry.position === 2 && (
                            <Medal className="w-5 h-5 text-gray-400 mr-2" />
                          )}
                          {entry.position === 3 && (
                            <Medal className="w-5 h-5 text-orange-500 mr-2" />
                          )}
                          <span className={`text-sm font-medium ${
                            isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {entry.position}
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
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {entry.calculatedGwsSurvived}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {entry.seasonRoundWins}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {entry.eliminations}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          !entry.isEliminated 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {!entry.isEliminated ? '✅' : '❌'}
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
                <p className="text-2xl font-bold text-gray-900">{entriesWithPositions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Players</p>
                <p className="text-2xl font-bold text-gray-900">
                  {entriesWithPositions.filter(entry => !entry.isEliminated).length}
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
