import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test basic connection
    const userCount = await prisma.user.count()
    
    // Test if we can query the Round table with new fields
    const rounds = await prisma.round.findMany({
      take: 1,
      select: {
        id: true,
        roundNumber: true,
        // Try to select new fields
        tiebreakStatus: true,
        tiebreakType: true,
        tiebreakStage: true,
        tiebreakDeadline: true
      }
    })
    
    // Test if we can query Entry table with new fields
    const entries = await prisma.entry.findMany({
      take: 1,
      select: {
        id: true,
        livesRemaining: true,
        // Try to select new fields
        usedExacto: true,
        exactoSuccess: true
      }
    })
    
    return Response.json({
      success: true,
      userCount,
      rounds: rounds.length,
      entries: entries.length,
      message: 'Schema test successful'
    })
  } catch (error) {
    console.error('Schema test error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
