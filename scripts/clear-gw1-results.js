const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing GW1 results...');

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

  console.log(`📅 Clearing ${gameweek1.fixtures.length} GW1 fixtures...`);

  // Clear all fixture results
  for (const fixture of gameweek1.fixtures) {
    await prisma.fixture.update({
      where: { id: fixture.id },
      data: {
        homeGoals: null,
        awayGoals: null,
        status: 'SCHEDULED'
      }
    });

    console.log(`✅ Cleared: ${fixture.homeTeam} v ${fixture.awayTeam}`);
  }

  // Mark GW1 as not settled
  await prisma.gameweek.update({
    where: { id: gameweek1.id },
    data: {
      isSettled: false,
      settledAt: null
    }
  });

  console.log('✅ GW1 marked as not settled');
  console.log('\n🎉 GW1 results cleared! Ready for correct results to be entered.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
