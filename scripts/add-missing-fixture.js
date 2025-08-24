const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding missing West Ham vs Chelsea fixture...');

  // Get the competition
  const competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });

  if (!competition) {
    console.log('❌ Competition not found');
    return;
  }

  // Get GW2
  const gameweek2 = await prisma.gameweek.findFirst({
    where: {
      competitionId: competition.id,
      gameweekNumber: 2
    }
  });

  if (!gameweek2) {
    console.log('❌ Gameweek 2 not found');
    return;
  }

  // Check if the fixture already exists
  const existingFixture = await prisma.fixture.findFirst({
    where: {
      gameweekId: gameweek2.id,
      homeTeam: 'West Ham United',
      awayTeam: 'Chelsea'
    }
  });

  if (existingFixture) {
    console.log('✅ West Ham vs Chelsea fixture already exists');
    return;
  }

  // Add the missing fixture
  const fixture = await prisma.fixture.create({
    data: {
      gameweekId: gameweek2.id,
      homeTeam: 'West Ham United',
      awayTeam: 'Chelsea',
      kickoff: new Date('2025-08-22T19:00:00Z'), // August 22nd, 7 PM UTC
      status: 'SCHEDULED'
    }
  });

  console.log('✅ Added West Ham United v Chelsea fixture to GW2');
  console.log(`   Kickoff: ${fixture.kickoff}`);
  console.log(`   Fixture ID: ${fixture.id}`);

  // Show all GW2 fixtures
  const allFixtures = await prisma.fixture.findMany({
    where: { gameweekId: gameweek2.id },
    orderBy: { kickoff: 'asc' }
  });

  console.log('\n📅 All GW2 Fixtures:');
  allFixtures.forEach(fixture => {
    console.log(`   ${fixture.homeTeam} v ${fixture.awayTeam} (${fixture.kickoff})`);
  });

  console.log('🎉 Missing fixture added successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
