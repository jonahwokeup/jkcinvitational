const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addGW6Fixtures() {
  try {
    console.log('🔍 Finding GW6...')
    
    // Find GW6
    const gw6 = await prisma.gameweek.findFirst({
      where: { gameweekNumber: 6 }
    })

    if (!gw6) {
      console.log('❌ GW6 not found. Creating GW6...')
      
      // Create GW6
      const newGW6 = await prisma.gameweek.create({
        data: {
          competitionId: 'cmeqfd0qv0000r2wfsvmpqnxc', // Replace with actual competition ID
          gameweekNumber: 6,
          lockTime: new Date('2025-09-27T07:30:00-05:00'), // 7:30 AM EST on Sep 27
          isSettled: false
        }
      })
      
      console.log('✅ Created GW6:', newGW6.id)
      var gameweekId = newGW6.id
    } else {
      console.log('✅ Found GW6:', gw6.id)
      var gameweekId = gw6.id
    }

    // GW6 Fixtures - September 2025 (EST times)
    const fixtures = [
      // Saturday, September 27th
      {
        homeTeam: 'Brentford',
        awayTeam: 'Manchester United',
        kickoff: new Date('2025-09-27T07:30:00-05:00'), // 7:30 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Chelsea',
        awayTeam: 'Brighton',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Crystal Palace',
        awayTeam: 'Liverpool',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Leeds United',
        awayTeam: 'Bournemouth',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Manchester City',
        awayTeam: 'Burnley',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Nottingham Forest',
        awayTeam: 'Sunderland',
        kickoff: new Date('2025-09-27T12:30:00-05:00'), // 12:30 PM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Tottenham',
        awayTeam: 'Wolves',
        kickoff: new Date('2025-09-27T15:00:00-05:00'), // 3:00 PM EST
        status: 'SCHEDULED'
      },
      // Sunday, September 28th
      {
        homeTeam: 'Aston Villa',
        awayTeam: 'Fulham',
        kickoff: new Date('2025-09-28T09:00:00-05:00'), // 9:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Newcastle',
        awayTeam: 'Arsenal',
        kickoff: new Date('2025-09-28T11:30:00-05:00'), // 11:30 AM EST
        status: 'SCHEDULED'
      },
      // Monday, September 29th
      {
        homeTeam: 'Everton',
        awayTeam: 'West Ham',
        kickoff: new Date('2025-09-29T15:00:00-05:00'), // 3:00 PM EST
        status: 'SCHEDULED'
      }
    ]

    console.log(`📅 Adding ${fixtures.length} fixtures to GW6...`)

    // Add each fixture
    for (const fixture of fixtures) {
      const createdFixture = await prisma.fixture.create({
        data: {
          gameweekId: gameweekId,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          kickoff: fixture.kickoff,
          status: fixture.status
        }
      })
      
      console.log(`✅ Added: ${fixture.homeTeam} vs ${fixture.awayTeam} at ${fixture.kickoff.toLocaleString()}`)
    }

    console.log('🎯 GW6 fixtures added successfully!')
    console.log(`📊 Total fixtures: ${fixtures.length}`)
    console.log(`🔒 Lock time: ${new Date('2025-09-27T07:30:00-05:00').toLocaleString()}`)

  } catch (error) {
    console.error('❌ Error adding GW6 fixtures:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addGW6Fixtures()
