import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🔄 Resetting gameweek data to clean state...\n')
    
    // Get all competitions
    const competitions = await prisma.competition.findMany({
      include: {
        gameweeks: {
          include: {
            fixtures: true
          }
        }
      }
    })
    
    const results = []
    
    for (const comp of competitions) {
      console.log(`\n📊 Processing Competition: ${comp.name}`)
      
      const compResult = {
        competition: comp.name,
        gameweeksDeleted: 0,
        fixturesDeleted: 0,
        details: [] as string[]
      }
      
      // Delete all fixtures first (to avoid foreign key constraints)
      for (const gameweek of comp.gameweeks) {
        if (gameweek.fixtures.length > 0) {
          const deleteResult = await prisma.fixture.deleteMany({
            where: { gameweekId: gameweek.id }
          })
          
          console.log(`   Deleted ${deleteResult.count} fixtures from GW${gameweek.gameweekNumber}`)
          compResult.fixturesDeleted += deleteResult.count
          compResult.details.push(`GW${gameweek.gameweekNumber}: deleted ${deleteResult.count} fixtures`)
        }
      }
      
      // Delete all gameweeks
      const deleteGameweeksResult = await prisma.gameweek.deleteMany({
        where: { competitionId: comp.id }
      })
      
      console.log(`   Deleted ${deleteGameweeksResult.count} gameweeks`)
      compResult.gameweeksDeleted = deleteGameweeksResult.count
      
      results.push(compResult)
    }
    
    console.log('\n✅ Gameweek reset completed!')
    console.log('   The site will now display the actual database state.')
    console.log('   You can now add the correct gameweek data manually or via import.')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Gameweek reset completed successfully',
      results 
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
