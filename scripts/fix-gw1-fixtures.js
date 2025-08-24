const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing GW1 fixtures to match actual Premier League GW1...');

  // Get the competition
  const competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });

  if (!competition) {
    console.log('❌ Competition not found');
    return;
  }

  // Get GW1
  const gameweek1 = await prisma.gameweek.findFirst({
    where: {
      competitionId: competition.id,
      gameweekNumber: 1
    },
    include: {
      fixtures: true
    }
  });

  if (!gameweek1) {
    console.log('❌ Gameweek 1 not found');
    return;
  }

  // Clear all current GW1 fixtures
  console.log('🗑️ Clearing current GW1 fixtures...');
  for (const fixture of gameweek1.fixtures) {
    await prisma.fixture.delete({
      where: { id: fixture.id }
    });
  }

  // Add the correct GW1 fixtures based on actual Premier League GW1
  const correctGW1Fixtures = [
    {
      homeTeam: 'Liverpool',
      awayTeam: 'Bournemouth',
      kickoff: new Date('2025-08-15T21:00:00Z'),
      homeGoals: 4,
      awayGoals: 2,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Aston Villa',
      awayTeam: 'Newcastle United',
      kickoff: new Date('2025-08-16T13:30:00Z'),
      homeGoals: 0,
      awayGoals: 0,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Sunderland',
      awayTeam: 'West Ham United',
      kickoff: new Date('2025-08-16T16:00:00Z'),
      homeGoals: 3,
      awayGoals: 0,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Tottenham Hotspur',
      awayTeam: 'Burnley',
      kickoff: new Date('2025-08-16T16:00:00Z'),
      homeGoals: 3,
      awayGoals: 0,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Brighton & Hove Albion',
      awayTeam: 'Fulham',
      kickoff: new Date('2025-08-16T16:00:00Z'),
      homeGoals: 1,
      awayGoals: 1,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Wolverhampton Wanderers',
      awayTeam: 'Manchester City',
      kickoff: new Date('2025-08-16T18:30:00Z'),
      homeGoals: 0,
      awayGoals: 4,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Chelsea',
      awayTeam: 'Crystal Palace',
      kickoff: new Date('2025-08-17T15:00:00Z'),
      homeGoals: 0,
      awayGoals: 0,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Nottingham Forest',
      awayTeam: 'Brentford',
      kickoff: new Date('2025-08-17T15:00:00Z'),
      homeGoals: 3,
      awayGoals: 1,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Manchester United',
      awayTeam: 'Arsenal',
      kickoff: new Date('2025-08-17T17:30:00Z'),
      homeGoals: 0,
      awayGoals: 1,
      status: 'FINISHED'
    },
    {
      homeTeam: 'Leeds United',
      awayTeam: 'Everton',
      kickoff: new Date('2025-08-18T21:00:00Z'),
      homeGoals: 1,
      awayGoals: 0,
      status: 'FINISHED'
    }
  ];

  console.log('✅ Adding correct GW1 fixtures...');
  for (const fixtureData of correctGW1Fixtures) {
    const fixture = await prisma.fixture.create({
      data: {
        gameweekId: gameweek1.id,
        homeTeam: fixtureData.homeTeam,
        awayTeam: fixtureData.awayTeam,
        kickoff: fixtureData.kickoff,
        homeGoals: fixtureData.homeGoals,
        awayGoals: fixtureData.awayGoals,
        status: fixtureData.status
      }
    });

    console.log(`✅ ${fixtureData.homeTeam} ${fixtureData.homeGoals}-${fixtureData.awayGoals} ${fixtureData.awayTeam}`);
  }

  // Mark GW1 as settled
  await prisma.gameweek.update({
    where: { id: gameweek1.id },
    data: {
      isSettled: true,
      settledAt: new Date()
    }
  });

  console.log('✅ GW1 marked as settled');
  console.log('\n🎉 GW1 fixtures fixed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
