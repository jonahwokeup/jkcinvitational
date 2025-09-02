import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatTimeUntil, isBeforeLock } from '@/lib/utils'
import { Trophy, Clock, Users, Calendar, LogOut } from 'lucide-react'
import DashboardHeader from '@/components/dashboard-header'
import type { Session } from 'next-auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Get user's entries with competition and round data
  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id },
    include: {
      competition: true,
      round: true,
      picks: {
        include: {
          gameweek: true,
          fixture: true,
        },
        orderBy: { gameweek: { gameweekNumber: 'desc' } },
      },
    },
    orderBy: { competition: { createdAt: 'desc' } },
  })

  console.log('🔍 Dashboard Debug:');
  console.log('  User ID:', session.user.id);
  console.log('  Entries found:', entries.length);
  entries.forEach((entry, i) => {
    console.log(`  Entry ${i + 1}: Competition ${entry.competition.name}, Round ${entry.round?.roundNumber}`);
  });

  // Get next gameweek for each competition
  const competitionsWithNextGameweek = await Promise.all(
    entries.map(async (entry) => {
      // Find the next available gameweek for picks
      // This should be the first gameweek that's not settled and not locked yet
      const nextGameweek = await prisma.gameweek.findFirst({
        where: {
          competitionId: entry.competitionId,
          isSettled: false, // Not settled yet
          lockTime: { gt: new Date() }, // Not locked yet
        },
        orderBy: { gameweekNumber: 'asc' }, // Order by gameweek number, not lock time
      })

      return {
        ...entry,
        nextGameweek,
      }
    })
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader 
          userName={session.user.name || session.user.email}
        />

        {competitionsWithNextGameweek.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Competitions Yet</h2>
            <p className="text-gray-600 mb-6">Join a competition to get started!</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Join Competition
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {competitionsWithNextGameweek.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {entry.competition.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    entry.livesRemaining > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {entry.livesRemaining > 0 ? 'Alive' : 'Eliminated'}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Round {entry.round?.roundNumber}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{entry.seasonRoundWins} round wins</span>
                  </div>

                  {entry.nextGameweek && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>
                        GW {entry.nextGameweek.gameweekNumber} locks {formatTimeUntil(entry.nextGameweek.lockTime)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Link
                    href={`/competition/${entry.competitionId}`}
                    className="block w-full text-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    View Competition
                  </Link>
                  
                  {entry.livesRemaining > 0 && entry.nextGameweek && isBeforeLock(entry.nextGameweek.lockTime) && (
                    <Link
                      href={`/competition/${entry.competitionId}/pick`}
                      className="block w-full text-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Make Pick
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
