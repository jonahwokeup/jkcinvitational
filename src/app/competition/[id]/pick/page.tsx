import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatTimeUntil, isBeforeLock } from '@/lib/utils'
import { Target, Clock, Check, X } from 'lucide-react'
import PickForm from './pick-form'
import TeamCrest from '@/components/team-crest'
import type { Session } from 'next-auth'

interface PickPageProps {
  params: Promise<{ id: string }>
}

export default async function PickPage({ params }: PickPageProps) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Properly await params.id for Next.js 15
  const { id: competitionId } = await params
  
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      gameweeks: {
        where: { lockTime: { gt: new Date() } },
        orderBy: { lockTime: 'asc' },
        take: 1,
        include: {
          fixtures: true,
        },
      },
    },
  })

  if (!competition) {
    // If competition not found, redirect to the correct one
    const correctCompetition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    });
    
    if (correctCompetition && correctCompetition.id !== competitionId) {
      console.log(`🔄 Redirecting from ${competitionId} to ${correctCompetition.id}`);
      redirect(`/competition/${correctCompetition.id}/pick`);
    }
    
    notFound()
  }

  const nextGameweek = competition.gameweeks[0]

  // Debug logging
  console.log('🔍 Pick Page Debug:');
  console.log('  Params ID received:', competitionId);
  console.log('  Competition ID found:', competition.id);
  console.log('  Competition Name:', competition.name);
  console.log('  Total gameweeks:', competition.gameweeks.length);
  console.log('  Gameweeks data:', JSON.stringify(competition.gameweeks, null, 2));
  console.log('  Next gameweek:', nextGameweek ? `Gameweek ${nextGameweek.gameweekNumber}` : 'None');

  if (!nextGameweek) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Upcoming Gameweek</h1>
            <p className="text-gray-600 mb-6">There are no upcoming gameweeks to make picks for.</p>
            <p className="text-sm text-gray-500 mb-4">Debug: Found {competition.gameweeks.length} total gameweeks</p>
            <Link
              href={`/competition/${competition.id}`}
              className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Back to Competition
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get user's entry and picks
  const entry = await prisma.entry.findFirst({
    where: {
      userId: session.user.id,
      competitionId: competition.id,
      roundId: { not: null },
    },
    include: {
      picks: {
        include: {
          gameweek: true,
          fixture: true,
        },
      },
    },
  })

  if (!entry) {
    redirect(`/competition/${competition.id}`)
  }

  if (entry.livesRemaining <= 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">You&apos;re Eliminated</h1>
            <p className="text-gray-600 mb-6">You cannot make picks in this round.</p>
            <Link
              href={`/competition/${competition.id}`}
              className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Back to Competition
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Check if user already has a pick for this gameweek
  const existingPick = entry.picks.find((pick: any) => pick.gameweekId === nextGameweek.id)

  // Find the earliest kickoff time for this gameweek
  const earliestKickoff = nextGameweek.fixtures.reduce((earliest: Date, fixture: any) => {
    return fixture.kickoff < earliest ? fixture.kickoff : earliest
  }, nextGameweek.fixtures[0]?.kickoff || new Date())

  // Allow changes until the first match starts
  const canChangePick = isBeforeLock(earliestKickoff)
  const isLocked = !canChangePick

  if (existingPick && !canChangePick) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Pick Already Made</h1>
            <p className="text-gray-600 mb-6">
              You have already made your pick for Gameweek {nextGameweek.gameweekNumber}. 
              The first match has started, so you can no longer change your pick.
            </p>
            <Link
              href={`/competition/${competition.id}`}
              className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Back to Competition
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const usedTeams = entry.picks.map((pick: any) => pick.team)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Make Your Pick</h1>
              <p className="text-gray-600">
                {competition.name} - Gameweek {nextGameweek.gameweekNumber}
              </p>
            </div>
            <Link
              href={`/competition/${competition.id}`}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Gameweek Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Gameweek {nextGameweek.gameweekNumber}
              </h2>
              <p className="text-gray-600">
                {nextGameweek.fixtures.length} fixtures scheduled
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4 mr-1" />
                First match starts {formatTimeUntil(earliestKickoff)}
              </div>
              {isLocked && (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                  Locked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Current Pick Display */}
        {existingPick && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Your Current Pick</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-green-600" />
                <span className="text-lg font-medium text-green-900">
                  {existingPick.team}
                </span>
                <span className="text-sm text-green-700">
                  (vs {existingPick.fixture?.homeTeam === existingPick.team ? existingPick.fixture?.awayTeam : existingPick.fixture?.homeTeam})
                </span>
              </div>
              {canChangePick && (
                <span className="text-sm text-green-700">
                  You can change this pick until the first match starts
                </span>
              )}
            </div>
          </div>
        )}

        {/* Used Teams */}
        {usedTeams.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Teams Used This Round</h3>
            <div className="flex flex-wrap gap-2">
              {usedTeams.map((team: string) => (
                <div key={team} className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  <TeamCrest teamName={team} size="sm" />
                  <span>{team}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pick Form */}
        {!isLocked ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {existingPick ? 'Change Your Pick' : 'Select Your Team'}
            </h3>
            <PickForm
              fixtures={nextGameweek.fixtures}
              usedTeams={usedTeams}
              isLocked={isLocked}
              gameweekId={nextGameweek.id}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Gameweek Locked</h3>
            <p className="text-gray-600">
              The first match has started. You can no longer make or change picks.
            </p>
          </div>
        )}

        {/* Fixtures */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gameweek Fixtures</h3>
          <div className="space-y-3">
            {nextGameweek.fixtures.map((fixture: any) => (
              <div
                key={fixture.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <TeamCrest teamName={fixture.homeTeam} size="sm" />
                  <span className="text-gray-500">vs</span>
                  <TeamCrest teamName={fixture.awayTeam} size="sm" />
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(fixture.kickoff, "PPp")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
