import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function MinimalDashboardPage() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      redirect('/auth/signin')
    }

    // Test the most basic query possible
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    if (!user) {
      return (
        <div className="min-h-screen bg-gray-50 p-8">
          <h1 className="text-2xl font-bold text-red-600">User Not Found</h1>
        </div>
      )
    }

    // Test basic entry query without any new fields
    const entries = await prisma.entry.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        livesRemaining: true,
        competitionId: true,
        roundId: true
      },
      take: 1
    })

    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold mb-4">Minimal Dashboard Test</h1>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">User Info:</h2>
          <p>ID: {user.id}</p>
          <p>Email: {user.email}</p>
          <p>Name: {user.name}</p>
          
          <h2 className="text-lg font-semibold mb-2 mt-4">Entries:</h2>
          <p>Found: {entries.length} entries</p>
          {entries.length > 0 && (
            <div>
              <p>Entry ID: {entries[0].id}</p>
              <p>Lives: {entries[0].livesRemaining}</p>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Minimal Dashboard - Error</h1>
        <div className="bg-red-50 p-4 rounded shadow border border-red-200">
          <h2 className="text-lg font-semibold mb-2 text-red-800">Error Details:</h2>
          <pre className="text-sm bg-red-100 p-2 rounded text-red-800">
            {error instanceof Error ? error.message : 'Unknown error'}
          </pre>
          <h3 className="text-md font-semibold mb-2 mt-4 text-red-800">Stack Trace:</h3>
          <pre className="text-sm bg-red-100 p-2 rounded text-red-800">
            {error instanceof Error ? error.stack : 'No stack trace'}
          </pre>
        </div>
      </div>
    )
  }
}
