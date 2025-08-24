const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GW1 Results from actual 2025/26 Premier League season
const GW1_RESULTS = [
  { homeTeam: 'Liverpool', awayTeam: 'Bournemouth', homeGoals: 4, awayGoals: 2 },
  { homeTeam: 'Aston Villa', awayTeam: 'Newcastle United', homeGoals: 0, awayGoals: 0 },
  { homeTeam: 'Sunderland', awayTeam: 'West Ham United', homeGoals: 3, awayGoals: 0 },
  { homeTeam: 'Tottenham Hotspur', awayTeam: 'Burnley', homeGoals: 3, awayGoals: 0 },
  { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Fulham', homeGoals: 1, awayGoals: 1 },
  { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Manchester City', homeGoals: 0, awayGoals: 4 },
  { homeTeam: 'Chelsea', awayTeam: 'Crystal Palace', homeGoals: 0, awayGoals: 0 },
  { homeTeam: 'Nottingham Forest', awayTeam: 'Brentford', homeGoals: 3, awayGoals: 1 },
  { homeTeam: 'Manchester United', awayTeam: 'Arsenal', homeGoals: 0, awayGoals: 1 },
  { homeTeam: 'Leeds United', awayTeam: 'Everton', homeGoals: 1, awayGoals: 0 }
];

async function main() {
  console.log('📝 Entering GW1 results...');

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

  console.log(`📅 Updating ${gameweek1.fixtures.length} GW1 fixtures...`);

  // Update each fixture with results
  for (const result of GW1_RESULTS) {
    const fixture = gameweek1.fixtures.find(f => 
      f.homeTeam === result.homeTeam && f.awayTeam === result.awayTeam
    );

    if (fixture) {
      await prisma.fixture.update({
        where: { id: fixture.id },
        data: {
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          status: 'FINISHED'
        }
      });

      console.log(`✅ ${result.homeTeam} ${result.homeGoals} - ${result.awayGoals} ${result.awayTeam}`);
    } else {
      console.log(`❌ Fixture not found: ${result.homeTeam} v ${result.awayTeam}`);
    }
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

  // Process picks and update lives (if any picks were made)
  const picks = await prisma.pick.findMany({
    where: { gameweekId: gameweek1.id },
    include: {
      entry: {
        include: { user: true }
      },
      fixture: true
    }
  });

  if (picks.length > 0) {
    console.log(`\n🎯 Processing ${picks.length} picks...`);
    
    for (const pick of picks) {
      const fixture = pick.fixture;
      const selectedTeam = pick.team;
      
      // Determine if the pick won, drew, or lost
      let result = 'LOSS';
      if (fixture.homeGoals === fixture.awayGoals) {
        result = 'DRAW';
      } else if (
        (selectedTeam === fixture.homeTeam && fixture.homeGoals > fixture.awayGoals) ||
        (selectedTeam === fixture.awayTeam && fixture.awayGoals > fixture.homeGoals)
      ) {
        result = 'WIN';
      }

      console.log(`   ${pick.entry.user.name}: ${selectedTeam} - ${result}`);

      // Update lives based on result
      if (result === 'LOSS') {
        await prisma.entry.update({
          where: { id: pick.entryId },
          data: { livesRemaining: 0 }
        });
        console.log(`     ❌ ${pick.entry.user.name} eliminated`);
      }
    }
  } else {
    console.log('\n⚠️ No picks found for GW1 - all users will remain with 1 life');
  }

  console.log('\n🎉 GW1 results entered successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
