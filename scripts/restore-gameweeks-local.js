const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev.db"
    }
  }
})

async function restoreGameweeks() {
  try {
    console.log('🔄 Restoring correct gameweek data...\n')
    
    // Get the competition
    const competition = await prisma.competition.findFirst({
      where: { isActive: true }
    })
    
    if (!competition) {
      console.log('❌ No active competition found')
      return
    }
    
    console.log(`📊 Processing Competition: ${competition.name}`)
    
    // Define the correct gameweek data
    const gameweekData = [
      {
        gameweekNumber: 1,
        lockTime: new Date('2024-08-15T19:00:00Z'),
        isSettled: true,
        settledAt: new Date('2024-08-19T00:00:00Z'),
        fixtures: [
          { homeTeam: 'Liverpool', awayTeam: 'Bournemouth', kickoff: new Date('2024-08-15T19:00:00Z'), homeGoals: 4, awayGoals: 2, status: 'FINISHED' },
          { homeTeam: 'Aston Villa', awayTeam: 'Newcastle United', kickoff: new Date('2024-08-16T14:00:00Z'), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Fulham', kickoff: new Date('2024-08-16T14:00:00Z'), homeGoals: 1, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Sunderland', awayTeam: 'West Ham United', kickoff: new Date('2024-08-16T14:00:00Z'), homeGoals: 3, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Tottenham Hotspur', awayTeam: 'Burnley', kickoff: new Date('2024-08-16T14:00:00Z'), homeGoals: 3, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Manchester City', kickoff: new Date('2024-08-16T14:00:00Z'), homeGoals: 0, awayGoals: 4, status: 'FINISHED' },
          { homeTeam: 'Chelsea', awayTeam: 'Crystal Palace', kickoff: new Date('2024-08-17T14:00:00Z'), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Nottingham Forest', awayTeam: 'Brentford', kickoff: new Date('2024-08-17T14:00:00Z'), homeGoals: 3, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Manchester United', awayTeam: 'Arsenal', kickoff: new Date('2024-08-17T16:30:00Z'), homeGoals: 0, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Leeds United', awayTeam: 'Everton', kickoff: new Date('2024-08-18T14:00:00Z'), homeGoals: 1, awayGoals: 0, status: 'FINISHED' }
        ]
      },
      {
        gameweekNumber: 2,
        lockTime: new Date('2024-08-22T19:00:00Z'),
        isSettled: true,
        settledAt: new Date('2024-08-26T00:00:00Z'),
        fixtures: [
          { homeTeam: 'West Ham United', awayTeam: 'Chelsea', kickoff: new Date('2024-08-22T19:00:00Z'), homeGoals: 1, awayGoals: 5, status: 'FINISHED' },
          { homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', kickoff: new Date('2024-08-23T14:00:00Z'), homeGoals: 0, awayGoals: 2, status: 'FINISHED' },
          { homeTeam: 'Bournemouth', awayTeam: 'Wolverhampton Wanderers', kickoff: new Date('2024-08-23T14:00:00Z'), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Brentford', awayTeam: 'Aston Villa', kickoff: new Date('2024-08-23T14:00:00Z'), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Burnley', awayTeam: 'Sunderland', kickoff: new Date('2024-08-23T14:00:00Z'), homeGoals: 2, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Arsenal', awayTeam: 'Leeds United', kickoff: new Date('2024-08-23T14:00:00Z'), homeGoals: 5, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Crystal Palace', awayTeam: 'Nottingham Forest', kickoff: new Date('2024-08-24T14:00:00Z'), homeGoals: 1, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Everton', awayTeam: 'Brighton & Hove Albion', kickoff: new Date('2024-08-24T14:00:00Z'), homeGoals: 2, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Fulham', awayTeam: 'Manchester United', kickoff: new Date('2024-08-24T14:00:00Z'), homeGoals: 1, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Newcastle United', awayTeam: 'Liverpool', kickoff: new Date('2024-08-25T14:00:00Z'), homeGoals: 2, awayGoals: 3, status: 'FINISHED' }
        ]
      },
      {
        gameweekNumber: 3,
        lockTime: new Date('2024-08-30T14:00:00Z'),
        isSettled: true,
        settledAt: new Date('2024-08-31T23:59:59Z'),
        fixtures: [
          { homeTeam: 'Chelsea', awayTeam: 'Fulham', kickoff: new Date('2024-08-30T14:00:00Z'), homeGoals: 2, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Manchester United', awayTeam: 'Burnley', kickoff: new Date('2024-08-30T14:00:00Z'), homeGoals: 3, awayGoals: 2, status: 'FINISHED' },
          { homeTeam: 'Sunderland', awayTeam: 'Brentford', kickoff: new Date('2024-08-30T14:00:00Z'), homeGoals: 2, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Tottenham Hotspur', awayTeam: 'Bournemouth', kickoff: new Date('2024-08-30T14:00:00Z'), homeGoals: 0, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Everton', kickoff: new Date('2024-08-30T14:00:00Z'), homeGoals: 2, awayGoals: 3, status: 'FINISHED' },
          { homeTeam: 'Leeds United', awayTeam: 'Newcastle United', kickoff: new Date('2024-08-30T14:00:00Z'), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Manchester City', kickoff: new Date('2024-08-31T14:00:00Z'), homeGoals: 2, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Nottingham Forest', awayTeam: 'West Ham United', kickoff: new Date('2024-08-31T14:00:00Z'), homeGoals: 0, awayGoals: 3, status: 'FINISHED' },
          { homeTeam: 'Liverpool', awayTeam: 'Arsenal', kickoff: new Date('2024-08-31T16:30:00Z'), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Aston Villa', awayTeam: 'Crystal Palace', kickoff: new Date('2024-08-31T14:00:00Z'), homeGoals: 0, awayGoals: 3, status: 'FINISHED' }
        ]
      },
      {
        gameweekNumber: 4,
        lockTime: new Date('2024-09-06T14:00:00Z'),
        isSettled: false,
        settledAt: null,
        fixtures: [
          { homeTeam: 'Arsenal', awayTeam: 'Nottingham Forest', kickoff: new Date('2024-09-06T14:00:00Z'), homeGoals: 3, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Bournemouth', awayTeam: 'Brighton & Hove Albion', kickoff: new Date('2024-09-06T14:00:00Z'), homeGoals: 2, awayGoals: 1, status: 'FINISHED' },
          { homeTeam: 'Crystal Palace', awayTeam: 'Sunderland', kickoff: new Date('2024-09-06T14:00:00Z'), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Everton', awayTeam: 'Aston Villa', kickoff: new Date('2024-09-06T14:00:00Z'), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Fulham', awayTeam: 'Leeds United', kickoff: new Date('2024-09-06T14:00:00Z'), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'Newcastle United', awayTeam: 'Wolverhampton Wanderers', kickoff: new Date('2024-09-06T14:00:00Z'), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
          { homeTeam: 'West Ham United', awayTeam: 'Tottenham Hotspur', kickoff: new Date('2024-09-06T16:30:00Z'), homeGoals: 0, awayGoals: 2, status: 'IN_PROGRESS' },
          { homeTeam: 'Brentford', awayTeam: 'Chelsea', kickoff: new Date('2024-09-07T14:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Burnley', awayTeam: 'Liverpool', kickoff: new Date('2024-09-07T08:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Manchester City', awayTeam: 'Manchester United', kickoff: new Date('2024-09-07T10:30:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' }
        ]
      },
      {
        gameweekNumber: 5,
        lockTime: new Date('2024-09-20T06:30:00Z'),
        isSettled: false,
        settledAt: null,
        fixtures: [
          { homeTeam: 'Liverpool', awayTeam: 'Everton', kickoff: new Date('2024-09-20T06:30:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Tottenham Hotspur', kickoff: new Date('2024-09-20T09:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Burnley', awayTeam: 'Nottingham Forest', kickoff: new Date('2024-09-20T09:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'West Ham United', awayTeam: 'Crystal Palace', kickoff: new Date('2024-09-20T09:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Leeds United', kickoff: new Date('2024-09-20T09:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Manchester United', awayTeam: 'Chelsea', kickoff: new Date('2024-09-20T11:30:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Fulham', awayTeam: 'Brentford', kickoff: new Date('2024-09-20T14:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Bournemouth', awayTeam: 'Newcastle United', kickoff: new Date('2024-09-21T08:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Sunderland', awayTeam: 'Aston Villa', kickoff: new Date('2024-09-21T08:00:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
          { homeTeam: 'Arsenal', awayTeam: 'Manchester City', kickoff: new Date('2024-09-21T10:30:00Z'), homeGoals: null, awayGoals: null, status: 'SCHEDULED' }
        ]
      }
    ]
    
    const results = []
    
    for (const gwData of gameweekData) {
      console.log(`\n📅 Creating GW${gwData.gameweekNumber}...`)
      
      // Create gameweek
      const gameweek = await prisma.gameweek.create({
        data: {
          competitionId: competition.id,
          gameweekNumber: gwData.gameweekNumber,
          lockTime: gwData.lockTime,
          isSettled: gwData.isSettled,
          settledAt: gwData.settledAt
        }
      })
      
      console.log(`   ✅ Created GW${gwData.gameweekNumber}`)
      
      // Create fixtures
      let fixtureCount = 0
      for (const fixtureData of gwData.fixtures) {
        await prisma.fixture.create({
          data: {
            gameweekId: gameweek.id,
            homeTeam: fixtureData.homeTeam,
            awayTeam: fixtureData.awayTeam,
            kickoff: fixtureData.kickoff,
            homeGoals: fixtureData.homeGoals,
            awayGoals: fixtureData.awayGoals,
            status: fixtureData.status
          }
        })
        fixtureCount++
      }
      
      console.log(`   ✅ Added ${fixtureCount} fixtures`)
      
      results.push({
        gameweek: gwData.gameweekNumber,
        fixtures: fixtureCount,
        status: gwData.isSettled ? 'Settled' : 'Active'
      })
    }
    
    console.log('\n✅ Gameweek restoration completed!')
    console.log('Results:', results)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreGameweeks()
