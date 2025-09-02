import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/auth'
import Link from 'next/link'
import ManagePicksForm from './manage-picks-form'

export default async function ManagePicksPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions) as any

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is Jonah McGowan (admin)
  if (session.user.email !== 'jonah@jkc.com') {
    redirect('/dashboard')
  }

  const { id: competitionId } = await params
  
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      gameweeks: {
        include: {
          fixtures: {
            orderBy: { kickoff: 'asc' }
          }
        },
        orderBy: { gameweekNumber: 'asc' }
      },
      rounds: {
        include: {
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
        },
        orderBy: { roundNumber: 'asc' }
      }
    }
  })

  if (!competition) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">
              Manage Picks - {competition.name}
            </h1>
            <Link
              href={`/competition/${competitionId}`}
              className="px-4 py-2 text-white hover:text-gray-200 transition-colors"
            >
              ← Back
            </Link>
          </div>
          
          <ManagePicksForm 
            competition={competition}
            gameweeks={competition.gameweeks}
            rounds={competition.rounds}
          />
        </div>
      </div>
    </div>
  )
}
