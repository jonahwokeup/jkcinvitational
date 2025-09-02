import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EnterResultsForm from './enter-results-form'
import RealTimeResultsForm from './real-time-results-form'
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gameweek Results Management</h1>
            <p className="text-gray-600">Choose how you want to manage gameweek results</p>
          </div>
          <Link
            href={`/competition/${competitionId}`}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-Time Updates (Recommended)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Update individual fixture results as matches finish. Perfect for live updates during gameweek.
          </p>
          <RealTimeResultsForm competitionId={competitionId} />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Entry (Legacy)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter all results at once when the entire gameweek is complete.
          </p>
          <EnterResultsForm competitionId={competitionId} />
        </div>
      </div>
    </div>
  )
}
