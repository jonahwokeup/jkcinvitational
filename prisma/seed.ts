import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Premier League teams for 2024/25 season
const PREMIER_LEAGUE_TEAMS = [
  "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton & Hove Albion",
  "Burnley", "Chelsea", "Crystal Palace", "Everton", "Fulham",
  "Leeds United", "Liverpool", "Manchester City", "Manchester United", "Newcastle United",
  "Nottingham Forest", "Sunderland", "Tottenham Hotspur", "West Ham United", "Wolverhampton Wanderers"
]

// Generate realistic Premier League fixtures for a season
function generateSeasonFixtures() {
  const fixtures = []
  const teams = [...PREMIER_LEAGUE_TEAMS]
  
  // Each team plays every other team twice (home and away)
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      // Home fixture
      fixtures.push({
        homeTeam: teams[i],
        awayTeam: teams[j]
      })
      // Away fixture
      fixtures.push({
        homeTeam: teams[j],
        awayTeam: teams[i]
      })
    }
  }
  
  // Shuffle fixtures to make it more realistic
  return fixtures.sort(() => Math.random() - 0.5)
}

// Generate 38 matchweeks with realistic dates
function generateMatchweeks() {
  const matchweeks = []
  const seasonStart = new Date("2025-08-16") // Premier League typically starts mid-August 2025/26
  
  for (let i = 1; i <= 38; i++) {
    const weekStart = new Date(seasonStart)
    weekStart.setDate(weekStart.getDate() + (i - 1) * 7) // Each week starts 7 days apart
    
    // Add some variation to match days (not all on same day)
    const matchDay = new Date(weekStart)
    matchDay.setDate(matchDay.getDate() + Math.floor(Math.random() * 3)) // 0-2 days offset
    
    matchweeks.push({
      gameweekNumber: i,
      lockTime: new Date(matchDay.getTime() + 14 * 60 * 60 * 1000), // 2 PM kickoff
      fixtures: []
    })
  }
  
  return matchweeks
}

// Distribute fixtures across matchweeks
function distributeFixturesToMatchweeks(fixtures: Array<{homeTeam: string, awayTeam: string}>, matchweeks: Array<{gameweekNumber: number, lockTime: Date, fixtures: Array<{homeTeam: string, awayTeam: string}>}>) {
  const fixturesPerWeek = Math.ceil(fixtures.length / matchweeks.length)
  
  for (let i = 0; i < matchweeks.length; i++) {
    const startIndex = i * fixturesPerWeek
    const endIndex = Math.min(startIndex + fixturesPerWeek, fixtures.length)
    
    for (let j = startIndex; j < endIndex; j++) {
      if (fixtures[j]) {
        matchweeks[i].fixtures.push(fixtures[j])
      }
    }
  }
  
  return matchweeks
}

async function main() {
  console.log('🌱 Seeding database with full Premier League season...')

  // Create JKC Invitational competition
  const competition = await prisma.competition.create({
    data: {
      name: "JKC Invitational",
      season: "2025/26 Premier League",
      timezone: "Europe/London",
      startDate: new Date("2025-08-16"),
      endDate: new Date("2026-05-24"),
      lockPolicy: "FIRST_GW_KICKOFF",
      resultPolicy: "DRAW_ELIM_LOSS_ELIM",
      livesPerRound: 1,
      inviteCode: "JKC2025",
      isActive: true,
    },
  })

  // Create Round 1
  const round1 = await prisma.round.create({
    data: {
      roundNumber: 1,
      competitionId: competition.id,
    },
  })

  // Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "jonah@jkc.com",
        name: "Jonah McGowan"
      }
    }),
    prisma.user.create({
      data: {
        email: "max@jkc.com",
        name: "Max Reid"
      }
    }),
    prisma.user.create({
      data: {
        email: "abboud@jkc.com",
        name: "Abboud Hammour"
      }
    }),
    prisma.user.create({
      data: {
        email: "chris@jkc.com",
        name: "Chris Grube"
      }
    })
  ])

  // Create entries for Round 1
  await Promise.all(
    users.map(user =>
      prisma.entry.create({
        data: {
          userId: user.id,
          competitionId: competition.id,
          roundId: round1.id,
          livesRemaining: 1,
        },
      })
    )
  )

  // Generate all fixtures and matchweeks
  const allFixtures = generateSeasonFixtures()
  const matchweeks = generateMatchweeks()
  const matchweeksWithFixtures = distributeFixturesToMatchweeks(allFixtures, matchweeks)

  console.log(`📅 Creating ${matchweeksWithFixtures.length} matchweeks...`)

  // Create all matchweeks and fixtures
  for (const matchweekData of matchweeksWithFixtures) {
    const matchweek = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: matchweekData.gameweekNumber,
        lockTime: matchweekData.lockTime,
      },
    })

    console.log(`  📊 Gameweek ${matchweek.gameweekNumber}: ${matchweekData.fixtures.length} fixtures`)

    // Create fixtures for this matchweek
    for (const fixtureData of matchweekData.fixtures) {
      const kickoff = new Date(matchweekData.lockTime)
      kickoff.setHours(kickoff.getHours() + Math.floor(Math.random() * 48)) // Spread fixtures across 2 days
      
      await prisma.fixture.create({
        data: {
          gameweekId: matchweek.id,
          homeTeam: fixtureData.homeTeam,
          awayTeam: fixtureData.awayTeam,
          kickoff: kickoff,
          status: "SCHEDULED",
        },
      })
    }
  }

  // Create sample picks for the first few gameweeks (for testing)
  const user1 = users[0]
  const user2 = users[1]
  
  // Get first gameweek for sample picks
  const firstGameweek = await prisma.gameweek.findFirst({
    where: { gameweekNumber: 1 }
  })
  
  if (firstGameweek) {
    const firstFixture = await prisma.fixture.findFirst({
      where: { gameweekId: firstGameweek.id }
    })
    
    if (firstFixture) {
      await prisma.pick.create({
        data: {
          entryId: (await prisma.entry.findFirst({ where: { userId: user1.id } }))!.id,
          gameweekId: firstGameweek.id,
          fixtureId: firstFixture.id,
          team: firstFixture.homeTeam,
        },
      })
    }
  }

  console.log('✅ Full Premier League season created successfully!')
  console.log(`🏆 Competition: ${competition.name}`)
  console.log(`📅 Season: ${competition.season}`)
  console.log(`🎯 Matchweeks: 38`)
  console.log(`⚽ Total Fixtures: ${allFixtures.length}`)
  console.log(`👥 Users: ${users.length}`)
  console.log(`🔑 Invite Code: ${competition.inviteCode}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
