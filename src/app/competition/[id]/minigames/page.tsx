import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Gamepad2, Trophy, Target, Users } from 'lucide-react'
import type { Session } from 'next-auth'

interface MinigamesPageProps {
  params: Promise<{ id: string }>
}

export default async function MinigamesPage({ params }: MinigamesPageProps) {
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
        },
      },
    },
  })

  if (!competition) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Minigames</h1>
              <p className="text-gray-600">{competition.name} - {competition.season}</p>
            </div>
            <Link
              href={`/competition/${competition.id}`}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
          </div>
        </div>

        {/* Minigames Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Whomst Card Game */}
          <Link
            href={`/competition/${competition.id}/minigames/whomst`}
            className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow"
          >
            <Gamepad2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Whomst</h3>
            <p className="text-gray-600 mb-4">A strategic card game for football fans</p>
            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium inline-block">
              Play Now
            </div>
          </Link>

          {/* Coming Soon Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600 mb-4">More exciting minigames are in development!</p>
            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium inline-block">
              In Development
            </div>
          </div>

          {/* Placeholder for Future Games */}
          <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">Future Game</h3>
            <p className="text-gray-500">More minigames will be added here</p>
          </div>

          <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">Future Game</h3>
            <p className="text-gray-500">More minigames will be added here</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">About Minigames</h3>
          <p className="text-blue-800">
            Minigames will provide additional fun and engagement opportunities for players.
            These side games will be separate from the main competition but may offer
            rewards or bragging rights. Stay tuned for exciting new features!
          </p>
        </div>
      </div>
    </div>
  )
}
