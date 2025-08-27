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

    // Correct, settled GW2 results
    const GW2_RESULTS = [
      { homeTeam: 'West Ham United', awayTeam: 'Chelsea', homeGoals: 1, awayGoals: 5 },
      { homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', homeGoals: 0, awayGoals: 2 },
      { homeTeam: 'Bournemouth', awayTeam: 'Wolverhampton Wanderers', homeGoals: 1, awayGoals: 0 },
      { homeTeam: 'Brentford', awayTeam: 'Aston Villa', homeGoals: 1, awayGoals: 0 },
      { homeTeam: 'Burnley', awayTeam: 'Sunderland', homeGoals: 2, awayGoals: 0 },
      { homeTeam: 'Arsenal', awayTeam: 'Leeds United', homeGoals: 5, awayGoals: 0 },
      { homeTeam: 'Crystal Palace', awayTeam: 'Nottingham Forest', homeGoals: 1, awayGoals: 1 },
      { homeTeam: 'Everton', awayTeam: 'Brighton & Hove Albion', homeGoals: 2, awayGoals: 0 },
      { homeTeam: 'Fulham', awayTeam: 'Manchester United', homeGoals: 1, awayGoals: 1 },
      { homeTeam: 'Newcastle United', awayTeam: 'Liverpool', homeGoals: 2, awayGoals: 3 },
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

    console.log(`\n🎯 Summary:`);
    console.log(`   Total fixtures in GW2: ${gameweek2.fixtures.length}`);
    console.log(`   Results updated: ${updatedCount}`);

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
