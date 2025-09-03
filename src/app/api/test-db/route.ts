import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test basic database connection
    const userCount = await prisma.user.count()
    const competitionCount = await prisma.competition.count()
    const entryCount = await prisma.entry.count()
    
    return Response.json({
      success: true,
      data: {
        userCount,
        competitionCount,
        entryCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Database test error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
