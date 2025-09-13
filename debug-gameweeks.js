const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugGameweeks() {
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
    
    for (const comp of competitions) {
      console.log(`\n📊 Competition: ${comp.name}`)
      console.log(`   ID: ${comp.id}`)
      console.log(`   Gameweeks: ${comp.gameweeks.length}`)
      
      for (const gw of comp.gameweeks) {
        const now = new Date()
        const hasStartedFixtures = gw.fixtures.some(f => new Date(f.kickoff) < now)
        const hasFinishedFixtures = gw.fixtures.some(f => f.status === 'FINISHED')
        const isLocked = new Date(gw.lockTime) < now
        
        console.log(`\n   GW${gw.gameweekNumber}:`)
        console.log(`     ID: ${gw.id}`)
        console.log(`     Lock Time: ${gw.lockTime}`)
        console.log(`     Is Settled: ${gw.isSettled}`)
        console.log(`     Is Locked: ${isLocked}`)
        console.log(`     Has Started Fixtures: ${hasStartedFixtures}`)
        console.log(`     Has Finished Fixtures: ${hasFinishedFixtures}`)
        console.log(`     Fixtures: ${gw.fixtures.length}`)
        
        for (const fixture of gw.fixtures) {
          console.log(`       - ${fixture.homeTeam} vs ${fixture.awayTeam}`)
          console.log(`         Kickoff: ${fixture.kickoff}`)
          console.log(`         Status: ${fixture.status}`)
          console.log(`         Score: ${fixture.homeGoals}-${fixture.awayGoals}`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugGameweeks()
