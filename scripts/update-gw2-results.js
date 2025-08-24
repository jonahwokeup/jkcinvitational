const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateGW2Results() {
  try {
    console.log('🔍 Checking GW2 fixtures...');
    
    // Find GW2
    const gameweek2 = await prisma.gameweek.findFirst({
      where: { gameweekNumber: 2 },
      include: {
        fixtures: {
          orderBy: { kickoff: 'asc' }
        }
      }
    });

    if (!gameweek2) {
      console.log('❌ Gameweek 2 not found');
      return;
    }

    console.log(`✅ Found Gameweek 2 with ${gameweek2.fixtures.length} fixtures:`);
    gameweek2.fixtures.forEach(fixture => {
      console.log(`   ${fixture.homeTeam} v ${fixture.awayTeam} - ${fixture.status}`);
    });

    // GW2 Results (excluding Newcastle vs Liverpool which is still outstanding)
    const GW2_RESULTS = [
      { homeTeam: 'West Ham United', awayTeam: 'Chelsea', homeGoals: 2, awayGoals: 1 },
      { homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', homeGoals: 3, awayGoals: 1 },
      { homeTeam: 'Bournemouth', awayTeam: 'Wolverhampton Wanderers', homeGoals: 1, awayGoals: 1 },
      { homeTeam: 'Brentford', awayTeam: 'Aston Villa', homeGoals: 0, awayGoals: 2 },
      { homeTeam: 'Burnley', awayTeam: 'Sunderland', homeGoals: 1, awayGoals: 2 },
      { homeTeam: 'Arsenal', awayTeam: 'Leeds United', homeGoals: 2, awayGoals: 0 },
      { homeTeam: 'Crystal Palace', awayTeam: 'Nottingham Forest', homeGoals: 1, awayGoals: 1 },
      { homeTeam: 'Everton', awayTeam: 'Brighton & Hove Albion', homeGoals: 0, awayGoals: 1 },
      { homeTeam: 'Fulham', awayTeam: 'Manchester United', homeGoals: 1, awayGoals: 2 }
    ];

    console.log('\n📝 Updating GW2 results...');
    
    let updatedCount = 0;
    for (const result of GW2_RESULTS) {
      const fixture = await prisma.fixture.findFirst({
        where: {
          gameweekId: gameweek2.id,
          homeTeam: result.homeTeam,
          awayTeam: result.awayTeam
        }
      });

      if (fixture) {
        await prisma.fixture.update({
          where: { id: fixture.id },
          data: {
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            status: 'FINISHED'
          }
        });
        console.log(`✅ Updated: ${result.homeTeam} ${result.homeGoals}-${result.awayGoals} ${result.awayTeam}`);
        updatedCount++;
      } else {
        console.log(`❌ Fixture not found: ${result.homeTeam} v ${result.awayTeam}`);
      }
    }

    // Check Newcastle vs Liverpool (still outstanding)
    const newcastleLiverpool = await prisma.fixture.findFirst({
      where: {
        gameweekId: gameweek2.id,
        OR: [
          { homeTeam: 'Newcastle United', awayTeam: 'Liverpool' },
          { homeTeam: 'Liverpool', awayTeam: 'Newcastle United' }
        ]
      }
    });

    if (newcastleLiverpool) {
      console.log(`\n⏳ Newcastle vs Liverpool fixture found but not updated (still outstanding)`);
      console.log(`   Fixture ID: ${newcastleLiverpool.id}`);
      console.log(`   Current status: ${newcastleLiverpool.status}`);
    }

    console.log(`\n🎯 Summary:`);
    console.log(`   Total fixtures in GW2: ${gameweek2.fixtures.length}`);
    console.log(`   Results updated: ${updatedCount}`);
    console.log(`   Outstanding: 1 (Newcastle vs Liverpool)`);

    // Mark gameweek as settled if all fixtures are finished
    const unfinishedFixtures = await prisma.fixture.count({
      where: {
        gameweekId: gameweek2.id,
        status: { not: 'FINISHED' }
      }
    });

    if (unfinishedFixtures === 0) {
      await prisma.gameweek.update({
        where: { id: gameweek2.id },
        data: {
          isSettled: true,
          settledAt: new Date()
        }
      });
      console.log(`\n🏁 Gameweek 2 marked as settled!`);
    } else {
      console.log(`\n⏳ Gameweek 2 has ${unfinishedFixtures} unfinished fixtures`);
    }

  } catch (error) {
    console.error('❌ Error updating GW2 results:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateGW2Results();
