const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixFixtureShiftSafe() {
  try {
    console.log('🔧 Safely fixing fixture shift issue...\n')
    
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
    
    for (const comp of competitions) {
      console.log(`\n📊 Processing Competition: ${comp.name}`)
      
      // Get all gameweeks 6 and above, sorted by gameweek number ascending
      const gameweeksToShift = comp.gameweeks
        .filter(gw => gw.gameweekNumber >= 6)
        .sort((a, b) => a.gameweekNumber - b.gameweekNumber) // Process lowest first
      
      if (gameweeksToShift.length === 0) {
        console.log('   No gameweeks 6+ found, skipping...')
        continue
      }
      
      console.log(`   Found ${gameweeksToShift.length} gameweeks to shift`)
      
      // First, let's see what we're working with
      for (const gw of gameweeksToShift) {
        console.log(`     GW${gw.gameweekNumber}: ${gw.fixtures.length} fixtures`)
        if (gw.fixtures.length > 0) {
          console.log(`       First fixture: ${gw.fixtures[0].homeTeam} vs ${gw.fixtures[0].awayTeam}`)
        }
      }
      
      // Process in ascending order (lowest gameweek first)
      for (const currentGw of gameweeksToShift) {
        const newGwNumber = currentGw.gameweekNumber - 1
        
        console.log(`\n   Processing GW${currentGw.gameweekNumber} -> GW${newGwNumber}`)
        
        // Check if target gameweek exists
        const targetGw = comp.gameweeks.find(gw => gw.gameweekNumber === newGwNumber)
        
        if (targetGw) {
          console.log(`     Target GW${newGwNumber} exists with ${targetGw.fixtures.length} fixtures`)
          
          if (targetGw.fixtures.length > 0) {
            console.log(`     ⚠️  Target GW${newGwNumber} already has fixtures! Moving them to a temporary location first.`)
            
            // Create a temporary gameweek to store the existing fixtures
            const tempGameweek = await prisma.gameweek.create({
              data: {
                competitionId: comp.id,
                gameweekNumber: 999, // Temporary high number
                lockTime: new Date(),
                isSettled: false
              }
            })
            
            // Move existing fixtures to temp gameweek
            await prisma.fixture.updateMany({
              where: { gameweekId: targetGw.id },
              data: { gameweekId: tempGameweek.id }
            })
            
            console.log(`     📦 Moved existing fixtures to temporary GW999`)
          }
          
          // Move fixtures from current GW to target GW
          const updateResult = await prisma.fixture.updateMany({
            where: { gameweekId: currentGw.id },
            data: { gameweekId: targetGw.id }
          })
          
          console.log(`     ✅ Moved ${updateResult.count} fixtures from GW${currentGw.gameweekNumber} to GW${newGwNumber}`)
        } else {
          console.log(`     Target GW${newGwNumber} doesn't exist, creating it...`)
          
          // Create new gameweek
          const newGameweek = await prisma.gameweek.create({
            data: {
              competitionId: comp.id,
              gameweekNumber: newGwNumber,
              lockTime: new Date(Date.now() + (newGwNumber - 4) * 7 * 24 * 60 * 60 * 1000), // Rough estimate
              isSettled: false
            }
          })
          
          // Move all fixtures to new gameweek
          const updateResult = await prisma.fixture.updateMany({
            where: { gameweekId: currentGw.id },
            data: { gameweekId: newGameweek.id }
          })
          
          console.log(`     ✅ Created GW${newGwNumber} and moved ${updateResult.count} fixtures`)
        }
      }
      
      // Clean up temporary gameweeks (GW999)
      const tempGameweeks = await prisma.gameweek.findMany({
        where: {
          competitionId: comp.id,
          gameweekNumber: 999
        }
      })
      
      for (const tempGw of tempGameweeks) {
        console.log(`   🗑️  Deleting temporary GW999...`)
        await prisma.gameweek.delete({
          where: { id: tempGw.id }
        })
      }
      
      // Now clean up empty gameweeks (only delete if they have no fixtures)
      const emptyGameweeks = comp.gameweeks.filter(gw => 
        gw.gameweekNumber >= 5 && 
        gw.gameweekNumber <= 17
      )
      
      for (const emptyGw of emptyGameweeks) {
        // Check if this gameweek is now empty
        const fixtureCount = await prisma.fixture.count({
          where: { gameweekId: emptyGw.id }
        })
        
        if (fixtureCount === 0) {
          console.log(`   🗑️  Deleting empty GW${emptyGw.gameweekNumber}...`)
          await prisma.gameweek.delete({
            where: { id: emptyGw.id }
          })
        } else {
          console.log(`   ⚠️  GW${emptyGw.gameweekNumber} still has ${fixtureCount} fixtures, keeping it`)
        }
      }
    }
    
    console.log('\n✅ Fixture shift fix completed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixFixtureShiftSafe()
