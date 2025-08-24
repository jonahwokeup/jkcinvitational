const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding missing Liverpool v Bournemouth fixture to GW1...');

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
    }
  });

  if (!gameweek1) {
    console.log('❌ Gameweek 1 not found');
    return;
  }

  // Check if Liverpool v Bournemouth already exists
  const existingFixture = await prisma.fixture.findFirst({
    where: {
      gameweekId: gameweek1.id,
      homeTeam: 'Liverpool',
      awayTeam: 'Bournemouth'
    }
  });

  if (existingFixture) {
    console.log('✅ Liverpool v Bournemouth fixture already exists');
    return;
  }

  // Add the Liverpool v Bournemouth fixture
  const fixture = await prisma.fixture.create({
    data: {
      gameweekId: gameweek1.id,
      homeTeam: 'Liverpool',
      awayTeam: 'Bournemouth',
      kickoff: new Date('2025-08-15T21:00:00Z'), // Aug 15, 9 PM UTC
      homeGoals: 4,
      awayGoals: 2,
      status: 'FINISHED'
    }
  });

  console.log('✅ Added Liverpool 4-2 Bournemouth to GW1');
  console.log(`   Fixture ID: ${fixture.id}`);

  console.log('🎉 Liverpool fixture added successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
