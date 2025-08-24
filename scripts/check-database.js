const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database state...');

  // Check competition
  const competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });

  if (!competition) {
    console.log('❌ No competition found');
    return;
  }

  console.log(`✅ Competition: ${competition.name} (${competition.season})`);

  // Check rounds
  const rounds = await prisma.round.findMany({
    where: { competitionId: competition.id }
  });

  console.log(`📅 Rounds: ${rounds.length}`);
  rounds.forEach(round => {
    console.log(`  - Round ${round.roundNumber} (${round.endedAt ? 'Ended' : 'Active'})`);
  });

  // Check users
  const users = await prisma.user.findMany();
  console.log(`👥 Users: ${users.length}`);
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.email})`);
  });

  // Check entries
  const entries = await prisma.entry.findMany({
    where: { competitionId: competition.id },
    include: { user: true }
  });

  console.log(`🎯 Entries: ${entries.length}`);
  entries.forEach(entry => {
    console.log(`  - ${entry.user.name} (Round ${entry.roundId ? 'Yes' : 'No'}, Lives: ${entry.livesRemaining})`);
  });

  // Check gameweeks
  const gameweeks = await prisma.gameweek.findMany({
    where: { competitionId: competition.id },
    include: { fixtures: true },
    orderBy: { gameweekNumber: 'asc' }
  });

  console.log(`⚽ Gameweeks: ${gameweeks.length}`);
  gameweeks.forEach(gw => {
    console.log(`  - GW${gw.gameweekNumber}: ${gw.fixtures.length} fixtures`);
    if (gw.gameweekNumber === 2) {
      console.log('    GW2 Fixtures:');
      gw.fixtures.forEach(fixture => {
        console.log(`      ${fixture.homeTeam} v ${fixture.awayTeam} (${fixture.kickoff})`);
      });
    }
  });

  // Check if we need to create a round
  if (rounds.length === 0) {
    console.log('⚠️ No rounds found. Creating Round 1...');
    await prisma.round.create({
      data: {
        competitionId: competition.id,
        roundNumber: 1,
      }
    });
    console.log('✅ Created Round 1');
  }

  // Check if users need to be added to competition
  const usersWithoutEntries = users.filter(user => 
    !entries.some(entry => entry.userId === user.id)
  );

  if (usersWithoutEntries.length > 0) {
    console.log(`⚠️ ${usersWithoutEntries.length} users not in competition. Adding them...`);
    
    const currentRound = await prisma.round.findFirst({
      where: {
        competitionId: competition.id,
        endedAt: null
      },
      orderBy: { roundNumber: 'desc' }
    });

    if (currentRound) {
      for (const user of usersWithoutEntries) {
        await prisma.entry.create({
          data: {
            userId: user.id,
            competitionId: competition.id,
            roundId: currentRound.id,
            livesRemaining: competition.livesPerRound,
          }
        });
        console.log(`✅ Added ${user.name} to competition`);
      }
    } else {
      console.log('❌ No active round found');
    }
  }

  console.log('🎉 Database check completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
