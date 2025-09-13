import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🔧 Reversing fixture shift issue...\n')
    
    // Get all competitions
    const competitions = await prisma.competition.findMany({
      include: {
        gameweeks: {
          include: {
            fixtures: true
          },
          orderBy: { gameweekNumber: 'desc' } // Process highest first to avoid conflicts
        }
      }
    })
    
    const results = []
    
    for (const comp of competitions) {
      console.log(`\n📊 Processing Competition: ${comp.name}`)
      
      // Get only gameweeks 1-3, sorted by gameweek number descending
      const gameweeksToShift = comp.gameweeks
        .filter(gw => gw.gameweekNumber >= 1 && gw.gameweekNumber <= 3)
        .sort((a, b) => b.gameweekNumber - a.gameweekNumber) // Process highest first
      
      if (gameweeksToShift.length === 0) {
        console.log('   No gameweeks 1-3 found, skipping...')
        results.push({ competition: comp.name, message: 'No gameweeks 1-3 found' })
        continue
      }
      
      console.log(`   Found ${gameweeksToShift.length} gameweeks (1-3) to shift back`)
      
      const compResult = {
        competition: comp.name,
        gameweeksProcessed: 0,
        fixturesMoved: 0,
        details: [] as string[]
      }
      
      // Process in descending order (highest gameweek first)
      for (const currentGw of gameweeksToShift) {
        const newGwNumber = currentGw.gameweekNumber + 1
        
        console.log(`\n   Processing GW${currentGw.gameweekNumber} -> GW${newGwNumber}`)
        
        // Check if target gameweek exists
        const targetGw = comp.gameweeks.find(gw => gw.gameweekNumber === newGwNumber)
        
        if (targetGw) {
          console.log(`     Target GW${newGwNumber} already exists with ${targetGw.fixtures.length} fixtures`)
          console.log(`     ⚠️  Skipping GW${currentGw.gameweekNumber} to avoid conflict`)
          compResult.details.push(`Skipped GW${currentGw.gameweekNumber} -> GW${newGwNumber} (target exists)`)
          continue
        }
        
        // Create new gameweek
        const newGameweek = await prisma.gameweek.create({
          data: {
            competitionId: comp.id,
            gameweekNumber: newGwNumber,
            lockTime: new Date(Date.now() + (newGwNumber - 4) * 7 * 24 * 60 * 60 * 1000), // Rough estimate
            isSettled: currentGw.isSettled
          }
        })
        
        // Move all fixtures to new gameweek
        const updateResult = await prisma.fixture.updateMany({
          where: { gameweekId: currentGw.id },
          data: { gameweekId: newGameweek.id }
        })
        
        console.log(`     ✅ Created GW${newGwNumber} and moved ${updateResult.count} fixtures`)
        
        compResult.gameweeksProcessed++
        compResult.fixturesMoved += updateResult.count
        compResult.details.push(`Created GW${newGwNumber} and moved ${updateResult.count} fixtures from GW${currentGw.gameweekNumber}`)
      }
      
      results.push(compResult)
    }
    
    console.log('\n✅ Fixture shift reversal completed!')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Fixture shift reversal completed successfully',
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
