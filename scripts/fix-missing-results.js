const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixMissingResults() {
  try {
    console.log('🔧 Fixing missing fixture results...')
    
    // Get the competition
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    
    if (!competition) {
      console.error('❌ Competition not found')
      return
    }
    
    // Get Gameweek 1
    const gameweek1 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id,
        gameweekNumber: 1
      },
      include: {
        fixtures: true
      }
    })
    
    if (!gameweek1) {
      console.error('❌ Gameweek 1 not found')
      return
    }
    
    // Complete GW1 Results (some were missing)
    const completeResults = [
      { homeTeam: "Liverpool", awayTeam: "Bournemouth", homeGoals: 4, awayGoals: 2 },
      { homeTeam: "Aston Villa", awayTeam: "Newcastle United", homeGoals: 0, awayGoals: 0 },
      { homeTeam: "Brighton & Hove Albion", awayTeam: "Fulham", homeGoals: 1, awayGoals: 1 },
      { homeTeam: "Sunderland", awayTeam: "West Ham United", homeGoals: 3, awayGoals: 0 },
      { homeTeam: "Tottenham Hotspur", awayTeam: "Burnley", homeGoals: 3, awayGoals: 0 },
      { homeTeam: "Wolverhampton Wanderers", awayTeam: "Manchester City", homeGoals: 0, awayGoals: 4 },
      { homeTeam: "Chelsea", awayTeam: "Crystal Palace", homeGoals: 0, awayGoals: 0 },
      { homeTeam: "Nottingham Forest", awayTeam: "Brentford", homeGoals: 3, awayGoals: 1 },
      { homeTeam: "Manchester United", awayTeam: "Arsenal", homeGoals: 0, awayGoals: 1 },
      { homeTeam: "Leeds United", awayTeam: "Everton", homeGoals: 1, awayGoals: 0 }
    ]
    
    console.log('📊 Updating missing results...')
    
    // Update each fixture with complete results
    for (const result of completeResults) {
      const fixture = gameweek1.fixtures.find(f => 
        (f.homeTeam === result.homeTeam && f.awayTeam === result.awayTeam) ||
        (f.homeTeam === result.awayTeam && f.awayTeam === result.homeTeam)
      )
      
      if (fixture) {
        // Determine if we need to swap home/away
        const isSwapped = fixture.homeTeam === result.awayTeam && fixture.awayTeam === result.homeTeam
        
        await prisma.fixture.update({
          where: { id: fixture.id },
          data: {
            homeGoals: isSwapped ? result.awayGoals : result.homeGoals,
            awayGoals: isSwapped ? result.homeGoals : result.awayGoals,
            status: 'FINISHED'
          }
        })
        
        console.log(`  ✅ ${fixture.homeTeam} ${isSwapped ? result.awayGoals : result.homeGoals}-${isSwapped ? result.homeGoals : result.awayGoals} ${fixture.awayTeam}`)
      }
    }
    
    // Fix GW2 lock time (should be 2025, not 2024)
    const gameweek2 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id,
        gameweekNumber: 2
      }
    })
    
    if (gameweek2) {
      // Set GW2 lock time to a reasonable future date in 2025
      const gw2LockTime = new Date('2025-08-26T15:00:00Z')
      
      await prisma.gameweek.update({
        where: { id: gameweek2.id },
        data: { lockTime: gw2LockTime }
      })
      
      console.log(`\n🕐 Fixed GW2 lock time to: ${gw2LockTime.toISOString()}`)
    }
    
    console.log('\n✅ Missing results fixed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixMissingResults()

