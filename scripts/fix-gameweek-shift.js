const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev.db"
    }
  }
})

async function fixGameweekShift() {
  try {
    console.log('🔧 Fixing gameweek shift issue...\n')
    
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
      
      // Get all gameweeks sorted by number
      const gameweeks = comp.gameweeks.sort((a, b) => a.gameweekNumber - b.gameweekNumber)
      
      console.log(`   Found ${gameweeks.length} gameweeks`)
      
      // Check if there's a shift issue by looking at fixture patterns
      // If GW1 has the wrong fixtures, we need to shift everything down by 1
      
      // Let's check what GW1 currently has
      const gw1 = gameweeks.find(gw => gw.gameweekNumber === 1)
      if (gw1 && gw1.fixtures.length > 0) {
        console.log(`   GW1 has ${gw1.fixtures.length} fixtures`)
        console.log(`   First fixture: ${gw1.fixtures[0].homeTeam} vs ${gw1.fixtures[0].awayTeam}`)
        
        // Check if this looks like GW2 data (West Ham vs Chelsea)
        const firstFixture = gw1.fixtures[0]
        if (firstFixture.homeTeam === 'West Ham United' && firstFixture.awayTeam === 'Chelsea') {
          console.log('   ⚠️  GW1 has GW2 fixtures! Shifting all gameweeks down by 1...')
          
          // Shift all gameweeks down by 1
          for (let i = gameweeks.length - 1; i >= 0; i--) {
            const currentGw = gameweeks[i]
            const newNumber = currentGw.gameweekNumber - 1
            
            if (newNumber >= 1) {
              console.log(`     Shifting GW${currentGw.gameweekNumber} -> GW${newNumber}`)
              
              // Update the gameweek number
              await prisma.gameweek.update({
                where: { id: currentGw.id },
                data: { gameweekNumber: newNumber }
              })
            } else {
              console.log(`     Deleting GW${currentGw.gameweekNumber} (would become GW0)`)
              // Delete fixtures first
              await prisma.fixture.deleteMany({
                where: { gameweekId: currentGw.id }
              })
              // Then delete the gameweek
              await prisma.gameweek.delete({
                where: { id: currentGw.id }
              })
            }
          }
          
          console.log('   ✅ Gameweek shift completed!')
        } else {
          console.log('   ✅ GW1 has correct fixtures, no shift needed')
        }
      } else {
        console.log('   ⚠️  GW1 not found or has no fixtures')
      }
    }
    
    console.log('\n✅ Gameweek shift fix completed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixGameweekShift()
