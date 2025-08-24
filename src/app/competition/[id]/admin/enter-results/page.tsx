import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { redirect } from 'next/navigation'
import EnterResultsForm from './enter-results-form'
import type { Session } from 'next-auth'

interface EnterResultsPageProps {
  params: Promise<{ id: string }>
}

export default async function EnterResultsPage({ params }: EnterResultsPageProps) {
  const { id: competitionId } = await params
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }
  
  // Check if user is admin (you can add more sophisticated admin checks later)
  if (session.user.email !== 'jonah@jkc.com') {
    redirect(`/competition/${competitionId}`)
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enter Gameweek Results</h1>
        <p className="text-gray-600">Manually enter results for completed gameweeks</p>
      </div>
      
      <EnterResultsForm competitionId={competitionId} />
    </div>
  )
}
