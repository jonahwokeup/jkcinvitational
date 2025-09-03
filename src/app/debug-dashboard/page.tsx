import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function DebugDashboardPage() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      redirect('/auth/signin')
    }

    // Test basic user query
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // Test basic entry query without any includes
    const entries = await prisma.entry.findMany({
      where: { userId: session.user.id },
      take: 1 // Just get one entry
    })

    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Dashboard</h1>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Session Info:</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
              name: session.user.name
            }, null, 2)}
          </pre>
          
          <h2 className="text-lg font-semibold mb-2 mt-4">User Query Result:</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(user, null, 2)}
          </pre>
          
          <h2 className="text-lg font-semibold mb-2 mt-4">Entry Query Result:</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(entries, null, 2)}
          </pre>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Debug Dashboard - Error</h1>
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
