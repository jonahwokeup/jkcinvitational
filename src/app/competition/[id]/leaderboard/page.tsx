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
          round: true,
          whomstScores: {
            orderBy: {
              score: 'desc'
            }
          }
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
    // Count GWs survived (only count gameweeks where picks actually won)
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
    
    // Count unique gameweeks where the user actually WON (survived)
    // Only count gameweeks where they won, not just where they had picks
    gwsSurvived = Array.from(gameweekResults.values()).filter(result => result === true).length;
    
    // Count eliminations (gameweeks where user lost)
    const eliminations = Array.from(gameweekResults.values()).filter(result => result === false).length;
    
    // Check if currently eliminated
    const isEliminated = entry.livesRemaining <= 0;
    
    return {
      ...entry,
      calculatedGwsSurvived: gwsSurvived,
      eliminations,
      isEliminated
    };
  });

  // Sort entries by Round Wins (most important), then GWs Survived, then fewer eliminations
  entriesWithStats.sort((a, b) => {
    // 1. Round Wins (highest first)
    if (a.seasonRoundWins !== b.seasonRoundWins) {
      return b.seasonRoundWins - a.seasonRoundWins;
    }
    
    // 2. GWs Survived (if tied on Round Wins)
    if (a.calculatedGwsSurvived !== b.calculatedGwsSurvived) {
      return b.calculatedGwsSurvived - a.calculatedGwsSurvived;
    }
    
    // 3. Eliminations (if tied on both - fewer eliminations = better)
    if (a.eliminations !== b.eliminations) {
      return a.eliminations - b.eliminations;
    }
    
    // 4. If still tied, use creation time (earlier entry wins)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Handle ties - assign same position to players with identical records
  const entriesWithPositions = entriesWithStats.map((entry, index) => {
    let position = index + 1;
    
    if (index > 0) {
      const prevEntry = entriesWithStats[index - 1];
      if (prevEntry.seasonRoundWins === entry.seasonRoundWins &&
          prevEntry.calculatedGwsSurvived === entry.calculatedGwsSurvived &&
          prevEntry.eliminations === entry.eliminations) {
        // Find the first entry with these same stats
        const firstIndex = entriesWithStats.findIndex(e => 
          e.seasonRoundWins === entry.seasonRoundWins && 
          e.calculatedGwsSurvived === entry.calculatedGwsSurvived &&
          e.eliminations === entry.eliminations
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
                    Round Wins
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GWs Survived
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
                          {entry.seasonRoundWins}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {entry.calculatedGwsSurvived}
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

        {/* Whomst High Scores */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Trophy className="w-6 h-6 text-purple-600 mr-2" />
              Whomst High Scores
            </h2>
            <Link
              href={`/competition/${competitionId}/minigames`}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Play Whomst →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                      Best Score
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                      Games Played
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Get all Whomst scores and group by user
                    const allScores = competition.entries.flatMap(entry => 
                      entry.whomstScores.map(score => ({
                        ...score,
                        userName: entry.user.name || entry.user.email,
                        userId: entry.user.id
                      }))
                    );

                    // Group by user and find best score for each
                    const userBestScores = new Map();
                    allScores.forEach(score => {
                      const userId = score.userId;
                      if (!userBestScores.has(userId) || score.score > userBestScores.get(userId).score) {
                        userBestScores.set(userId, {
                          ...score,
                          totalGames: allScores.filter(s => s.userId === userId).length
                        });
                      }
                    });

                    // Sort by best score
                    const sortedScores = Array.from(userBestScores.values())
                      .sort((a, b) => b.score - a.score);

                    return sortedScores.map((score, index) => (
                      <tr key={score.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index === 0 && <Crown className="w-5 h-5 text-yellow-500 mr-2" />}
                            {index === 1 && <Medal className="w-5 h-5 text-gray-400 mr-2" />}
                            {index === 2 && <Medal className="w-5 h-5 text-amber-600 mr-2" />}
                            <span className="text-sm font-medium text-gray-900">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {score.userName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-lg font-bold text-purple-600">
                            {score.score}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-600">
                            {score.totalGames}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            score.gameType === 'tiebreak' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {score.gameType === 'tiebreak' ? 'Tiebreak' : 'Fun'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {formatDate(score.createdAt)}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
            {(() => {
              const allScores = competition.entries.flatMap(entry => entry.whomstScores);
              if (allScores.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No Whomst scores yet!</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Play Whomst in the minigames section to set your first score.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
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
