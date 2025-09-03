import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatTimeUntil, isBeforeLock } from '@/lib/utils'
import { Trophy, Users, Clock, Calendar, Target, LogOut, Settings, BarChart3, Gamepad2 } from 'lucide-react'
import CompetitionHeader from '@/components/competition-header'
import TeamCrest from '@/components/team-crest'
import ExactoButton from '@/components/exacto-button'
import Image from 'next/image'
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
              exactoPredictions: {
                include: {
                  gameweek: true,
                  fixture: true
                },
                orderBy: { gameweek: { gameweekNumber: 'desc' } }
              },
            },
          },
        },
      },
      gameweeks: {
        orderBy: { gameweekNumber: 'asc' },
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
  
  // Debug logging for gameweek detection
  console.log('🔍 Competition Page Debug:');
  console.log('  Competition:', competition.name);
  console.log('  Total gameweeks:', competition.gameweeks.length);
  
  competition.gameweeks.forEach(gw => {
    const lockTimePassed = !isBeforeLock(gw.lockTime);
    const hasPastFixtures = gw.fixtures && gw.fixtures.some(f => new Date(f.kickoff) < new Date());
    const hasFutureFixtures = gw.fixtures && gw.fixtures.some(f => new Date(f.kickoff) >= new Date());
    
    console.log(`  GW${gw.gameweekNumber}:`);
    console.log(`    Lock time: ${gw.lockTime}`);
    console.log(`    Lock time passed: ${lockTimePassed}`);
    console.log(`    Has past fixtures: ${hasPastFixtures}`);
    console.log(`    Has future fixtures: ${hasFutureFixtures}`);
    console.log(`    Is settled: ${gw.isSettled}`);
    console.log(`    Fixtures count: ${gw.fixtures?.length || 0}`);
  });
  
  // Find gameweeks in different states
  const scheduledGameweek = competition.gameweeks.find(gw => 
    isBeforeLock(gw.lockTime) && 
    !gw.isSettled && 
    (!gw.fixtures || gw.fixtures.every(fixture => new Date(fixture.kickoff) >= new Date()))
  )
  
  // A gameweek is current if it's not settled and either:
  // 1. Lock time has passed, OR
  // 2. Any fixtures have started (kickoff time has passed)
  const currentGameweek = competition.gameweeks.find(gw => 
    !gw.isSettled && 
    (!isBeforeLock(gw.lockTime) || 
     (gw.fixtures && gw.fixtures.some(fixture => new Date(fixture.kickoff) < new Date())))
  )
  
  console.log('🔍 Gameweek Detection Results:');
  console.log('  Scheduled gameweek:', scheduledGameweek ? `GW${scheduledGameweek.gameweekNumber}` : 'None');
  console.log('  Current gameweek:', currentGameweek ? `GW${currentGameweek.gameweekNumber}` : 'None');
  
  const settledGameweeks = competition.gameweeks.filter(gw => gw.isSettled)
  
  const aliveEntries = currentRound?.entries.filter((entry: any) => entry.livesRemaining > 0) || []
  const eliminatedEntries = currentRound?.entries.filter((entry: any) => entry.livesRemaining <= 0) || []

  // A gameweek is "locked" when it's current (in progress) - picks can't be changed
  // Also check if any fixtures have started (kickoff time has passed)
  const isLocked = currentGameweek ? true : 
    competition.gameweeks.some(gw => 
      !gw.isSettled && 
      gw.fixtures && 
      gw.fixtures.some(fixture => 
        new Date(fixture.kickoff) < new Date()
      )
    )
  
  console.log('🔍 Lock Status:');
  console.log('  isLocked:', isLocked);
  console.log('  showCrest should be:', isLocked);

  const getUserPlaceholder = (name: string) => {
    const nameLower = name.toLowerCase()
    let imageName = ''
    
    if (nameLower.includes('chris')) {
      imageName = 'chris.jpg'
    } else if (nameLower.includes('abboud')) {
      imageName = 'abboud.JPG'
    } else if (nameLower.includes('max')) {
      imageName = 'max.jpeg'
    } else if (nameLower.includes('jonah')) {
      imageName = 'jonah.jpeg'
    }
    
    if (imageName) {
      return (
        <div className="w-6 h-6 rounded-full overflow-hidden">
          <Image
            src={`/images/${imageName}`}
            alt={name}
            width={24}
            height={24}
            className="w-full h-full object-cover"
          />
        </div>
      )
    }
    
    // Fallback to initials if no custom image found
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
          currentUser={{
            name: session.user.name || session.user.email || 'Unknown User',
            email: session.user.email || '',
            image: session.user.image || undefined
          }}
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

            {/* Scheduled Gameweek */}
            {scheduledGameweek && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-1">
                      Gameweek {scheduledGameweek.gameweekNumber}
                    </h3>
                    <p className="text-blue-700">
                      First match starts {formatTimeUntil(scheduledGameweek.fixtures && scheduledGameweek.fixtures.length > 0 ? scheduledGameweek.fixtures[0].kickoff : scheduledGameweek.lockTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    {isBeforeLock(scheduledGameweek.fixtures && scheduledGameweek.fixtures.length > 0 ? scheduledGameweek.fixtures[0].kickoff : scheduledGameweek.lockTime) ? (
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

            {/* Current Gameweek */}
            {currentGameweek && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 mb-1">
                      Gameweek {currentGameweek.gameweekNumber} - In Progress
                    </h3>
                    <p className="text-green-700">
                      Picks are locked - matches are underway
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-600 font-medium">
                      🔒 Picks Locked
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User's Current Pick */}
            {scheduledGameweek && (
              (() => {
                const userEntry = aliveEntries.find((entry: any) => entry.user.id === session.user!.id)
                if (!userEntry) return null
                
                const currentPick = userEntry.picks.find((pick: any) => pick.gameweekId === scheduledGameweek.id)
                if (!currentPick) return null
                
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Your Pick for Gameweek {scheduledGameweek.gameweekNumber}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <TeamCrest teamName={currentPick.team} size="lg" />
                        <span className="text-sm text-green-700">
                          (vs {currentPick.fixture?.homeTeam === currentPick.team ? currentPick.fixture?.awayTeam : currentPick.fixture?.homeTeam})
                        </span>
                      </div>
                      {isBeforeLock(scheduledGameweek.lockTime) && (
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
                    
                    // Find the pick for the current locked gameweek
                    const currentGameweekPick = currentGameweek ? 
                      entry.picks.find((pick: any) => pick.gameweekId === currentGameweek.id) : null
                    
                    // Show team crest for current gameweek pick if locked, otherwise show last pick
                    const pickToShow = showCrest && currentGameweekPick ? currentGameweekPick : lastPick
                    
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
                          {pickToShow && (
                            <div className="mt-1">
                              {showCrest ? (
                                <TeamCrest teamName={pickToShow.team} size="sm" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eliminatedEntries.map((entry: any) => {
                    // For eliminated users, show their pick from the gameweek they were eliminated in
                    const eliminatedGameweekPick = entry.eliminatedAtGw ? 
                      entry.picks.find((pick: any) => pick.gameweek.gameweekNumber === entry.eliminatedAtGw) : null
                    
                    // Fallback to last pick if we can't find the eliminated gameweek pick
                    const pickToShow = eliminatedGameweekPick || entry.picks[entry.picks.length - 1]
                    
                    // Check if user has an Exacto prediction for the next gameweek
                    const hasExacto = entry.exactoPredictions && entry.exactoPredictions.length > 0
                    const currentExacto = hasExacto ? entry.exactoPredictions[0] : null
                    
                    // Get the next gameweek for Exacto
                    const nextGameweek = competition.gameweeks.find((gw: any) => 
                      gw.gameweekNumber > (currentGameweek?.gameweekNumber || 0) && 
                      !gw.isSettled
                    )
                    
                    return (
                      <div
                        key={entry.id}
                        className="bg-red-50 border border-red-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="font-medium text-red-900">
                                {entry.user.name || entry.user.email}
                              </p>
                              <p className="text-sm text-red-700">
                                Eliminated GW {entry.eliminatedAtGw}
                              </p>
                            </div>
                            {pickToShow && (
                              <div>
                                <TeamCrest teamName={pickToShow.team} size="sm" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            {/* Exacto Button - Only show for current user */}
                            {nextGameweek && entry.user.id === session.user!.id && (
                              <ExactoButton
                                entryId={entry.id}
                                gameweekId={nextGameweek.id}
                                competitionId={competition.id}
                                isEliminated={true}
                                hasExacto={hasExacto}
                                currentExacto={currentExacto ? {
                                  fixtureId: currentExacto.fixtureId,
                                  homeGoals: currentExacto.homeGoals,
                                  awayGoals: currentExacto.awayGoals
                                } : undefined}
                                gameweekNumber={nextGameweek.gameweekNumber}
                              />
                            )}
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">0</div>
                              <div className="text-xs text-red-600">lives</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tiebreak Section */}
            {currentRound && (currentRound as any).tiebreakStatus && ((currentRound as any).tiebreakStatus === 'pending' || (currentRound as any).tiebreakStatus === 'in_progress') && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Gamepad2 className="w-5 h-5 mr-2 text-purple-600" />
                  Whomst Tiebreak - Stage {(currentRound as any).tiebreakStage}
                </h3>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <p className="text-purple-800 mb-3">
                    All survivors have been eliminated! The round will be decided by a Whomst tiebreak.
                  </p>
                  
                  {(currentRound as any).tiebreakDeadline && (
                    <p className="text-sm text-purple-600 mb-3">
                      Deadline: {new Date((currentRound as any).tiebreakDeadline).toLocaleString()}
                    </p>
                  )}

                  {/* Check if current user is a participant */}
                  {(() => {
                    const userEntry = currentRound.entries.find((entry: any) => entry.user.id === session.user!.id)
                    if (!userEntry) return null
                    
                    const userParticipant = (currentRound as any).tiebreakParticipants?.find(
                      (p: any) => p.entryId === userEntry.id
                    )
                    
                    if (!userParticipant) return null
                    
                    if (userParticipant.attemptUsed) {
                      return (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                          <p className="text-green-800 font-medium">
                            ✅ You have submitted your tiebreak score: {userParticipant.score}
                          </p>
                        </div>
                      )
                    } else {
                      return (
                        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                          <p className="text-blue-800 mb-3">
                            You need to play Whomst to determine the round winner!
                          </p>
                          <Link
                            href={`/competition/${competition.id}/tiebreak`}
                            className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Play Whomst Tiebreak
                          </Link>
                        </div>
                      )
                    }
                  })()}
                </div>

                {/* Show all participants and their status */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(currentRound as any).tiebreakParticipants?.map((participant: any) => (
                    <div
                      key={participant.id}
                      className={`p-3 rounded-lg border ${
                        participant.attemptUsed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${
                            participant.attemptUsed ? 'text-green-900' : 'text-yellow-900'
                          }`}>
                            {participant.entry.user.name || participant.entry.user.email}
                          </p>
                          <p className={`text-sm ${
                            participant.attemptUsed ? 'text-green-700' : 'text-yellow-700'
                          }`}>
                            {participant.attemptUsed 
                              ? `Score: ${participant.score}` 
                              : 'Pending submission'
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
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
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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

          <Link
            href={`/competition/${competition.id}/insights`}
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
          >
            <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Insights</h3>
            <p className="text-gray-600">Team statistics and position tracking</p>
          </Link>

          <Link
            href={`/competition/${competition.id}/minigames`}
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
          >
            <Gamepad2 className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Minigames</h3>
            <p className="text-gray-600">Fun side games and challenges</p>
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

              <Link
                href={`/competition/${competition.id}/admin/manage-exactos`}
                className="block p-6 bg-orange-50 rounded-lg shadow-sm border border-orange-200 hover:shadow-md transition-shadow text-center"
              >
                <Target className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-orange-900 mb-1">Manage Exactos</h3>
                <p className="text-orange-700">View and monitor Exacto predictions</p>
              </Link>

              {currentRound && (currentRound as any).tiebreakStatus && ((currentRound as any).tiebreakStatus === 'pending' || (currentRound as any).tiebreakStatus === 'in_progress') && (
                <Link
                  href={`/competition/${competition.id}/admin/manage-tiebreak`}
                  className="block p-6 bg-purple-50 rounded-lg shadow-sm border border-purple-200 hover:shadow-md transition-shadow text-center"
                >
                  <Gamepad2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-purple-900 mb-1">Manage Tiebreak</h3>
                  <p className="text-purple-700">Monitor Whomst tiebreak progress</p>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
