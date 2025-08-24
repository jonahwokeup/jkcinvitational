import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { importFixtures, updateFixture, endSeason, settleGameweek } from '@/lib/actions'
import { Settings, Upload, Edit, Flag, Users } from 'lucide-react'
import type { Session } from 'next-auth'

interface AdminPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id: competitionId } = await params
  
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      gameweeks: {
        include: {
          fixtures: true,
        },
        orderBy: { gameweekNumber: 'desc' },
      },
      entries: {
        include: {
          user: true,
        },
      },
    },
  })

  if (!competition) {
    notFound()
  }

  // Check if user is admin (for now, anyone can access admin - in production you'd add proper admin roles)
  const userEntry = competition.entries.find(entry => entry.userId === session.user!.id)
  if (!userEntry) {
    redirect(`/competition/${competition.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
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

        {/* Admin Tools */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Upload className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Import Fixtures</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Upload CSV or manually add fixtures for new gameweeks
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              Import Fixtures
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Edit className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Update Results</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Manually update fixture scores and status
            </p>
            <Link
              href={`/competition/${competition.id}/admin/enter-results`}
              className="block w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Enter Results
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Settings className="w-8 h-8 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Manage Fixtures</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Organize fixtures into correct gameweeks and update results
            </p>
            <Link
              href={`/competition/${competition.id}/admin/manage-fixtures`}
              className="block w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Manage Fixtures
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Users className="w-8 h-8 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Manage Picks</h3>
            </div>
            <p className="text-gray-600 mb-4">
              View and edit picks for all users across gameweeks
            </p>
            <Link
              href={`/competition/${competition.id}/admin/manage-picks`}
              className="block w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Manage Picks
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Flag className="w-8 h-8 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">End Season</h3>
            </div>
            <p className="text-gray-600 mb-4">
              End the season and crown the champion
            </p>
            <button
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              disabled
              title="Feature coming soon"
            >
              End Season
            </button>
          </div>
        </div>

        {/* Gameweeks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Gameweeks</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {competition.gameweeks.map((gameweek) => (
              <div key={gameweek.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Gameweek {gameweek.gameweekNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {gameweek.fixtures.length} fixtures • 
                      Locked: {formatDate(gameweek.lockTime, "PPp")}
                      {gameweek.isSettled && (
                        <span className="ml-2 text-green-600">• Settled</span>
                      )}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {!gameweek.isSettled && (
                      <button
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
                        disabled
                        title="Feature coming soon"
                      >
                        Settle
                      </button>
                    )}
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competition Stats */}
        <div className="grid gap-6 md:grid-cols-4 mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Players</p>
                <p className="text-2xl font-bold text-gray-900">{competition.entries.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Gameweeks</p>
                <p className="text-2xl font-bold text-gray-900">{competition.gameweeks.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Flag className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {competition.isActive ? 'Active' : 'Ended'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Timezone</p>
                <p className="text-2xl font-bold text-gray-900">{competition.timezone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
