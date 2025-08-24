const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkGW1Fixtures() {
  try {
    console.log('🔍 Checking GW1 fixtures...')
    
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
    
    console.log(`📅 Gameweek 1 ID: ${gameweek1.id}`)
    console.log(`🔒 Lock Time: ${gameweek1.lockTime}`)
    
    // Get all fixtures for GW1
    const fixtures = await prisma.fixture.findMany({
      where: { gameweekId: gameweek1.id },
      orderBy: { kickoff: 'asc' }
    })
    
    console.log(`\n⚽ GW1 Fixtures (${fixtures.length}):`)
    fixtures.forEach((fixture, index) => {
      console.log(`  ${index + 1}. ${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.kickoff})`)
    })
    
    // Check if Tottenham is in any fixture
    const tottenhamFixtures = fixtures.filter(f => 
      f.homeTeam === "Tottenham Hotspur" || f.awayTeam === "Tottenham Hotspur"
    )
    
    if (tottenhamFixtures.length > 0) {
      console.log(`\n🦅 Tottenham fixtures found:`)
      tottenhamFixtures.forEach(fixture => {
        console.log(`  ${fixture.homeTeam} vs ${fixture.awayTeam}`)
      })
    } else {
      console.log(`\n❌ No Tottenham fixtures found in GW1`)
    }
    
    // Check if Liverpool is in any fixture
    const liverpoolFixtures = fixtures.filter(f => 
      f.homeTeam === "Liverpool" || f.awayTeam === "Liverpool"
    )
    
    if (liverpoolFixtures.length > 0) {
      console.log(`\n🔴 Liverpool fixtures found:`)
      liverpoolFixtures.forEach(fixture => {
        console.log(`  ${fixture.homeTeam} vs ${fixture.awayTeam}`)
      })
    } else {
      console.log(`\n❌ No Liverpool fixtures found in GW1`)
    }
    
  } catch (error) {
    console.error('❌ Error checking GW1 fixtures:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkGW1Fixtures()

