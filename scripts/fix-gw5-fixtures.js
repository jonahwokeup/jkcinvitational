const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Correct GW5 fixtures based on the provided image
const correctGW5Fixtures = [
  // Saturday, September 20, 2025
  { homeTeam: 'Liverpool', awayTeam: 'Everton', kickoff: '2025-09-20T07:30:00Z' },
  { homeTeam: 'Brighton', awayTeam: 'Tottenham', kickoff: '2025-09-20T10:00:00Z' },
  { homeTeam: 'Burnley', awayTeam: 'Nottingham Forest', kickoff: '2025-09-20T10:00:00Z' },
  { homeTeam: 'West Ham', awayTeam: 'Crystal Palace', kickoff: '2025-09-20T10:00:00Z' },
  { homeTeam: 'Wolves', awayTeam: 'Leeds', kickoff: '2025-09-20T10:00:00Z' },
  { homeTeam: 'Manchester United', awayTeam: 'Chelsea', kickoff: '2025-09-20T12:30:00Z' },
  { homeTeam: 'Fulham', awayTeam: 'Brentford', kickoff: '2025-09-20T15:00:00Z' },
  
  // Sunday, September 21, 2025
  { homeTeam: 'Bournemouth', awayTeam: 'Newcastle', kickoff: '2025-09-21T09:00:00Z' },
  { homeTeam: 'Sunderland', awayTeam: 'Aston Villa', kickoff: '2025-09-21T09:00:00Z' },
  { homeTeam: 'Arsenal', awayTeam: 'Manchester City', kickoff: '2025-09-21T11:30:00Z' }
]

async function fixGW5Fixtures() {
  try {
    console.log('🔧 Fixing GW5 fixtures...\n')
    
    // Find GW5
    const gw5 = await prisma.gameweek.findFirst({
      where: { gameweekNumber: 5 },
      include: { competition: true }
    })
    
    if (!gw5) {
      console.log('❌ GW5 not found')
      return
    }
    
    console.log(`📊 Found GW5: ${gw5.competition.name} - GW${gw5.gameweekNumber}`)
    console.log(`   Current fixtures: ${gw5.fixtures?.length || 0}`)
    
    // Delete existing GW5 fixtures
    if (gw5.fixtures && gw5.fixtures.length > 0) {
      console.log('🗑️  Deleting existing GW5 fixtures...')
      await prisma.fixture.deleteMany({
        where: { gameweekId: gw5.id }
      })
      console.log(`   Deleted ${gw5.fixtures.length} fixtures`)
    }
    
    // Create new GW5 fixtures
    console.log('➕ Creating correct GW5 fixtures...')
    for (const fixture of correctGW5Fixtures) {
      await prisma.fixture.create({
        data: {
          gameweekId: gw5.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          kickoff: new Date(fixture.kickoff),
          status: 'SCHEDULED',
          homeGoals: null,
          awayGoals: null
        }
      })
    }
    
    console.log(`✅ Created ${correctGW5Fixtures.length} new GW5 fixtures`)
    
    // Verify the fix
    const updatedGW5 = await prisma.gameweek.findUnique({
      where: { id: gw5.id },
      include: { fixtures: true }
    })
    
    console.log('\n📋 Updated GW5 fixtures:')
    updatedGW5.fixtures.forEach((fixture, i) => {
      console.log(`   ${i + 1}. ${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.kickoff}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixGW5Fixtures()
