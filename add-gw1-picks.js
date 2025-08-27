const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addGW1Picks() {
  try {
    console.log('🏆 Adding GW1 picks for all players...')
    
    // Get the competition
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    
    if (!competition) {
      console.error('❌ Competition not found')
      return
    }
    
    // Get Round 1
    const round1 = await prisma.round.findFirst({
      where: { 
        competitionId: competition.id,
        roundNumber: 1
      }
    })
    
    if (!round1) {
      console.error('❌ Round 1 not found')
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
    
    // Get all users
    const users = await prisma.user.findMany()
    console.log(`👥 Found ${users.length} users`)
    
    // Get all entries for Round 1
    const entries = await prisma.entry.findMany({
      where: { roundId: round1.id }
    })
    
    console.log(`📝 Found ${entries.length} entries for Round 1`)
    
    // GW1 Picks data
    const gw1Picks = [
      { playerName: "Jonah McGowan", team: "Liverpool" },
      { playerName: "Abboud Hammour", team: "Tottenham" },
      { playerName: "Chris Grube", team: "Tottenham" },
      { playerName: "Max Reid", team: "Tottenham" }
    ]
    
    // Add picks for each player
    for (const pickData of gw1Picks) {
      const user = users.find(u => u.name === pickData.playerName)
      if (!user) {
        console.error(`❌ User not found: ${pickData.playerName}`)
        continue
      }
      
      const entry = entries.find(e => e.userId === user.id)
      if (!entry) {
        console.error(`❌ Entry not found for user: ${pickData.playerName}`)
        continue
      }
      
      // Find a fixture for the team they picked
      const fixture = await prisma.fixture.findFirst({
        where: {
          gameweekId: gameweek1.id,
          OR: [
            { homeTeam: pickData.team },
            { awayTeam: pickData.team }
          ]
        }
      })
      
      if (!fixture) {
        console.error(`❌ Fixture not found for ${pickData.team} in GW1`)
        continue
      }
      
      // Check if pick already exists
      const existingPick = await prisma.pick.findFirst({
        where: {
          entryId: entry.id,
          gameweekId: gameweek1.id
        }
      })
      
      if (existingPick) {
        console.log(`⚠️  Pick already exists for ${pickData.playerName} in GW1`)
        continue
      }
      
      // Create the pick
      await prisma.pick.create({
        data: {
          entryId: entry.id,
          gameweekId: gameweek1.id,
          fixtureId: fixture.id,
          team: pickData.team,
        }
      })
      
      console.log(`✅ Added pick for ${pickData.playerName}: ${pickData.team}`)
    }
    
    console.log('🎉 GW1 picks added successfully!')
    
    // Show summary
    const allPicks = await prisma.pick.findMany({
      where: { gameweekId: gameweek1.id },
      include: {
        entry: {
          include: { user: true }
        }
      }
    })
    
    console.log('\n📊 GW1 Picks Summary:')
    allPicks.forEach(pick => {
      console.log(`  ${pick.entry.user.name}: ${pick.team}`)
    })
    
  } catch (error) {
    console.error('❌ Error adding GW1 picks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addGW1Picks()


