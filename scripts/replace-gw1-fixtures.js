const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function replaceGW1Fixtures() {
  try {
    console.log('🔄 Replacing GW1 fixtures with real results...')
    
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
      }
    })
    
    if (!gameweek1) {
      console.error('❌ Gameweek 1 not found')
      return
    }
    
    // Delete all existing GW1 fixtures
    console.log('🗑️  Deleting existing GW1 fixtures...')
    await prisma.fixture.deleteMany({
      where: { gameweekId: gameweek1.id }
    })
    
    // Real GW1 Results
    const realGW1Fixtures = [
      { homeTeam: "Liverpool", awayTeam: "Bournemouth", homeGoals: 4, awayGoals: 2, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Aston Villa", awayTeam: "Newcastle United", homeGoals: 0, awayGoals: 0, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Brighton & Hove Albion", awayTeam: "Fulham", homeGoals: 1, awayGoals: 1, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Sunderland", awayTeam: "West Ham United", homeGoals: 3, awayGoals: 0, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Tottenham Hotspur", awayTeam: "Burnley", homeGoals: 3, awayGoals: 0, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Wolverhampton Wanderers", awayTeam: "Manchester City", homeGoals: 0, awayGoals: 4, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Chelsea", awayTeam: "Crystal Palace", homeGoals: 0, awayGoals: 0, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Nottingham Forest", awayTeam: "Brentford", homeGoals: 3, awayGoals: 1, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Manchester United", awayTeam: "Arsenal", homeGoals: 0, awayGoals: 1, kickoff: new Date('2025-08-16T15:00:00Z') },
      { homeTeam: "Leeds United", awayTeam: "Everton", homeGoals: 1, awayGoals: 0, kickoff: new Date('2025-08-16T15:00:00Z') }
    ]
    
    console.log('➕ Creating new GW1 fixtures with real results...')
    
    // Create new fixtures with real results
    for (const fixtureData of realGW1Fixtures) {
      await prisma.fixture.create({
        data: {
          gameweekId: gameweek1.id,
          homeTeam: fixtureData.homeTeam,
          awayTeam: fixtureData.awayTeam,
          homeGoals: fixtureData.homeGoals,
          awayGoals: fixtureData.awayGoals,
          kickoff: fixtureData.kickoff,
          status: 'FINISHED'
        }
      })
      
      console.log(`  ✅ ${fixtureData.homeTeam} ${fixtureData.homeGoals}-${fixtureData.awayGoals} ${fixtureData.awayTeam}`)
    }
    
    // Mark GW1 as settled
    await prisma.gameweek.update({
      where: { id: gameweek1.id },
      data: { 
        isSettled: true,
        settledAt: new Date()
      }
    })
    
    console.log('🎉 GW1 marked as settled!')
    
    // Now we need to update the picks to match the new fixtures
    await updateGW1Picks(gameweek1.id)
    
    // Process the results and eliminate players
    await processGW1Results(gameweek1.id)
    
    console.log('✅ GW1 fixtures replacement complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Update GW1 picks to match new fixtures
async function updateGW1Picks(gameweekId) {
  try {
    console.log('🔄 Updating GW1 picks to match new fixtures...')
    
    // Get all picks for GW1
    const picks = await prisma.pick.findMany({
      where: { gameweekId },
      include: {
        entry: {
          include: {
            user: true
          }
        }
      }
    })
    
    console.log(`📊 Found ${picks.length} picks to update...`)
    
    for (const pick of picks) {
      // Find a fixture for the team they picked
      const fixture = await prisma.fixture.findFirst({
        where: {
          gameweekId: gameweekId,
          OR: [
            { homeTeam: pick.team },
            { awayTeam: pick.team }
          ]
        }
      })
      
      if (fixture) {
        // Update the pick to use the new fixture
        await prisma.pick.update({
          where: { id: pick.id },
          data: {
            fixtureId: fixture.id
          }
        })
        
        console.log(`  ✅ Updated ${pick.entry.user.name}'s pick: ${pick.team}`)
      } else {
        console.log(`  ❌ No fixture found for ${pick.entry.user.name}'s pick: ${pick.team}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating picks:', error)
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
replaceGW1Fixtures()

