const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAndFixGW1() {
  try {
    console.log('🔍 Checking current GW1 fixtures...')
    
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
    
    console.log(`📅 Found ${gameweek1.fixtures.length} fixtures in GW1:`)
    gameweek1.fixtures.forEach(fixture => {
      console.log(`  ${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.homeGoals || '?'}-${fixture.awayGoals || '?'}`)
    })
    
    // Real GW1 Results
    const realGW1Results = [
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
    
    console.log('\n🔄 Updating fixtures with real results...')
    
    // First, clear all existing results
    for (const fixture of gameweek1.fixtures) {
      await prisma.fixture.update({
        where: { id: fixture.id },
        data: {
          homeGoals: null,
          awayGoals: null,
          status: 'SCHEDULED'
        }
      })
    }
    
    // Now update with real results
    let updatedCount = 0
    for (const result of realGW1Results) {
      // Find the fixture that matches this result
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
        
        updatedCount++
        console.log(`  ✅ ${fixture.homeTeam} ${isSwapped ? result.awayGoals : result.homeGoals}-${isSwapped ? result.homeGoals : result.awayGoals} ${fixture.awayTeam}`)
      } else {
        console.log(`  ❌ No fixture found for ${result.homeTeam} vs ${result.awayTeam}`)
      }
    }
    
    console.log(`\n📊 Updated ${updatedCount} fixtures`)
    
    // Mark GW1 as settled
    await prisma.gameweek.update({
      where: { id: gameweek1.id },
      data: { 
        isSettled: true,
        settledAt: new Date()
      }
    })
    
    console.log('🎉 GW1 marked as settled!')
    
    // Process the results and eliminate players
    await processGW1Results(gameweek1.id)
    
    console.log('✅ GW1 results processing complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Process GW1 results and eliminate players
async function processGW1Results(gameweekId) {
  try {
    console.log(`🏆 Processing GW1 results and eliminating players...`)
    
    // Get all picks for GW1
    const picks = await prisma.pick.findMany({
      where: { gameweekId },
      include: {
        entry: {
          include: {
            user: true
          }
        },
        fixture: true
      }
    })
    
    console.log(`📊 Processing ${picks.length} picks...`)
    
    for (const pick of picks) {
      const fixture = pick.fixture
      
      if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
        // Determine if the picked team won, drew, or lost
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
        
        console.log(`  ${pick.entry.user.name}: ${pick.team} - ${result}`)
        
        // If player lost, eliminate them
        if (result === 'LOSS') {
          await prisma.entry.update({
            where: { id: pick.entry.id },
            data: {
              livesRemaining: 0,
              eliminatedAtGw: 1
            }
          })
          
          console.log(`    💀 ${pick.entry.user.name} eliminated!`)
        }
      }
    }
    
    console.log(`✅ GW1 results processed`)
    
  } catch (error) {
    console.error('❌ Error processing GW1 results:', error)
  }
}

// Run the script
checkAndFixGW1()


