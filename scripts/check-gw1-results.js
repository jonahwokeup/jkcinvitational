const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking GW1 fixtures and results...');

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

  console.log(`📅 GW1 Status: ${gameweek1.isSettled ? 'Settled' : 'Not Settled'}`);
  console.log(`📅 GW1 Settled At: ${gameweek1.settledAt || 'Not settled yet'}`);
  console.log(`⚽ GW1 Fixtures (${gameweek1.fixtures.length}):`);

  gameweek1.fixtures.forEach(fixture => {
    console.log(`   ${fixture.homeTeam} ${fixture.homeGoals || '?'} - ${fixture.awayGoals || '?'} ${fixture.awayTeam} (${fixture.status})`);
  });

  // Check if there are any picks for GW1
  const picks = await prisma.pick.findMany({
    where: {
      gameweekId: gameweek1.id
    },
    include: {
      entry: {
        include: {
          user: true
        }
      },
      fixture: true
    }
  });

  console.log(`\n🎯 GW1 Picks (${picks.length}):`);
  picks.forEach(pick => {
    console.log(`   ${pick.entry.user.name}: ${pick.team} (${pick.fixture.homeTeam} v ${pick.fixture.awayTeam})`);
  });

  // Check entries and their status
  const entries = await prisma.entry.findMany({
    where: { competitionId: competition.id },
    include: { user: true }
  });

  console.log(`\n👥 Competition Entries (${entries.length}):`);
  entries.forEach(entry => {
    console.log(`   ${entry.user.name}: ${entry.livesRemaining} lives remaining`);
  });

  console.log('\n🎉 GW1 check completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
