const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Removing duplicate West Ham United v Chelsea fixture...');

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

  // Find all West Ham United v Chelsea fixtures in GW2
  const duplicateFixtures = await prisma.fixture.findMany({
    where: {
      gameweekId: gameweek2.id,
      homeTeam: 'West Ham United',
      awayTeam: 'Chelsea'
    }
  });

  console.log(`Found ${duplicateFixtures.length} West Ham United v Chelsea fixtures in GW2`);

  if (duplicateFixtures.length <= 1) {
    console.log('✅ No duplicates found');
    return;
  }

  // Keep the first one, delete the rest
  const fixturesToDelete = duplicateFixtures.slice(1);
  
  for (const fixture of fixturesToDelete) {
    await prisma.fixture.delete({
      where: { id: fixture.id }
    });
    console.log(`🗑️ Deleted duplicate fixture: ${fixture.id}`);
  }

  console.log(`✅ Removed ${fixturesToDelete.length} duplicate fixture(s)`);

  // Show remaining fixtures in GW2
  const remainingFixtures = await prisma.fixture.findMany({
    where: { gameweekId: gameweek2.id },
    orderBy: { kickoff: 'asc' }
  });

  console.log('\n📅 Remaining GW2 Fixtures:');
  remainingFixtures.forEach(fixture => {
    console.log(`   ${fixture.homeTeam} v ${fixture.awayTeam} (${fixture.kickoff})`);
  });

  console.log('\n🎉 Duplicate removal completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
