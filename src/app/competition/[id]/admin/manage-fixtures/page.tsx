import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/auth'
import ManageFixturesForm from './manage-fixtures-form'

export default async function ManageFixturesPage({
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
          <h1 className="text-3xl font-bold text-white mb-6">
            Manage Fixtures - {competition.name}
          </h1>
          
          <ManageFixturesForm 
            competition={competition}
            gameweeks={competition.gameweeks}
          />
        </div>
      </div>
    </div>
  )
}
