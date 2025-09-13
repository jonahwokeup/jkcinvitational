import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Debugging Gameweeks and Fixtures...\n')
    
    // Get all competitions
    const competitions = await prisma.competition.findMany({
      include: {
        gameweeks: {
          include: {
            fixtures: true
          },
          orderBy: { gameweekNumber: 'asc' }
        }
      }
    })
    
    const debugData = []
    
    for (const comp of competitions) {
      const compData = {
        name: comp.name,
        id: comp.id,
        gameweeks: comp.gameweeks.map(gw => {
          const now = new Date()
          const hasStartedFixtures = gw.fixtures.some(f => new Date(f.kickoff) < now)
          const hasFinishedFixtures = gw.fixtures.some(f => f.status === 'FINISHED')
          const isLocked = new Date(gw.lockTime) < now
          
          return {
            gameweekNumber: gw.gameweekNumber,
            id: gw.id,
            lockTime: gw.lockTime,
            isSettled: gw.isSettled,
            isLocked,
            hasStartedFixtures,
            hasFinishedFixtures,
            fixtures: gw.fixtures.map(f => ({
              id: f.id,
              homeTeam: f.homeTeam,
              awayTeam: f.awayTeam,
              kickoff: f.kickoff,
              status: f.status,
              homeGoals: f.homeGoals,
              awayGoals: f.awayGoals
            }))
          }
        })
      }
      debugData.push(compData)
    }
    
    return NextResponse.json({ success: true, data: debugData })
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
