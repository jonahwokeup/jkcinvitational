const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkCurrentStatus() {
  try {
    console.log('🔍 Checking current database status...')
    
    // Get the competition
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    
    if (!competition) {
      console.error('❌ Competition not found')
      return
    }
    
    console.log(`🏆 Competition: ${competition.name}`)
    
    // Check GW1 status
    const gameweek1 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id,
        gameweekNumber: 1
      },
      include: {
        fixtures: true
      }
    })
    
    if (gameweek1) {
      console.log(`\n📅 GW1 Status: ${gameweek1.isSettled ? 'SETTLED' : 'NOT SETTLED'}`)
      console.log(`   Fixtures: ${gameweek1.fixtures.length}`)
      console.log(`   Settled at: ${gameweek1.settledAt || 'Not settled'}`)
      
      // Check fixture results
      gameweek1.fixtures.forEach(fixture => {
        console.log(`   ${fixture.homeTeam} ${fixture.homeGoals || '?'}-${fixture.awayGoals || '?'} ${fixture.awayTeam} (${fixture.status})`)
      })
    }
    
    // Check all entries and their status
    const entries = await prisma.entry.findMany({
      where: { competitionId: competition.id },
      include: {
        user: true,
        picks: {
          include: {
            fixture: true
          }
        }
      }
    })
    
    console.log(`\n👥 Entries (${entries.length}):`)
    entries.forEach(entry => {
      console.log(`   ${entry.user.name}: ${entry.livesRemaining} lives, eliminated at GW${entry.eliminatedAtGw || 'N/A'}`)
      
      entry.picks.forEach(pick => {
        const fixture = pick.fixture
        if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
          let result
          if (pick.team === fixture.homeTeam) {
            if (fixture.homeGoals > fixture.awayGoals) result = 'WIN'
            else if (fixture.homeGoals === fixture.awayGoals) result = 'DRAW'
            else result = 'LOSS'
          } else {
            if (fixture.awayGoals > fixture.homeGoals) result = 'WIN'
            else if (fixture.awayGoals === fixture.homeGoals) result = 'DRAW'
            else result = 'LOSS'
          }
          
          console.log(`     ${pick.team}: ${result} (${fixture.homeTeam} ${fixture.homeGoals}-${fixture.awayGoals} ${fixture.awayTeam})`)
        }
      })
    })
    
    // Check if there are any issues
    const eliminatedPlayers = entries.filter(e => e.livesRemaining === 0)
    if (eliminatedPlayers.length > 0) {
      console.log(`\n⚠️  Found ${eliminatedPlayers.length} eliminated players who should have survived:`)
      eliminatedPlayers.forEach(entry => {
        console.log(`   ${entry.user.name} - eliminated at GW${entry.eliminatedAtGw}`)
      })
      
      console.log('\n🔄 Fixing eliminated players...')
      
      // Fix the eliminated players - they should all have 1 life remaining
      for (const entry of eliminatedPlayers) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: {
            livesRemaining: 1,
            eliminatedAtGw: null
          }
        })
        console.log(`   ✅ Fixed ${entry.user.name}`)
      }
    }
    
    // Check GW2 status
    const gameweek2 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id,
        gameweekNumber: 2
      }
    })
    
    if (gameweek2) {
      console.log(`\n📅 GW2 Status: ${gameweek2.isSettled ? 'SETTLED' : 'NOT SETTLED'}`)
      console.log(`   Lock time: ${gameweek2.lockTime}`)
    }
    
    console.log('\n✅ Status check complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
checkCurrentStatus()


