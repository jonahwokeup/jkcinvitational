const { PrismaClient } = require('@prisma/client');

// Set production database URL for this script
process.env.PRODUCTION_DATABASE_URL = "postgresql://postgres.ckvakpaauvtkxvqzhhpk:survivor2644@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

const prisma = new PrismaClient({
  datasourceUrl: process.env.PRODUCTION_DATABASE_URL
});

async function main() {
  console.log('🎯 Fixing GW3 fixtures to ensure they are all in the past...');
  
  try {
    const competition = await prisma.competition.findFirst({ 
      where: { name: 'JKC Invitational' } 
    });
    
    if (!competition) {
      throw new Error('Competition not found');
    }
    
    console.log(`✅ Found competition: ${competition.name}`);
    
    const gw3 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id, 
        gameweekNumber: 3 
      },
      include: { fixtures: true }
    });
    
    if (!gw3) {
      throw new Error('Gameweek 3 not found');
    }
    
    console.log(`✅ Found GW3: ${gw3.gameweekNumber}`);
    console.log(`📅 GW3 lock time: ${gw3.lockTime}`);
    
    // Fix all GW3 fixtures to have past kickoff times
    const fixtureUpdates = [
      { homeTeam: 'Chelsea', awayTeam: 'Fulham', kickoff: '2025-08-30T07:30:00.000Z' },
      { homeTeam: 'Manchester United', awayTeam: 'Burnley', kickoff: '2025-08-30T10:00:00.000Z' },
      { homeTeam: 'Tottenham Hotspur', awayTeam: 'Bournemouth', kickoff: '2025-08-30T10:00:00.000Z' },
      { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Everton', kickoff: '2025-08-30T10:00:00.000Z' },
      { homeTeam: 'Sunderland', awayTeam: 'Brentford', kickoff: '2025-08-30T10:00:00.000Z' },
      { homeTeam: 'Leeds United', awayTeam: 'Newcastle United', kickoff: '2025-08-30T12:30:00.000Z' },
      { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Manchester City', kickoff: '2025-08-30T13:00:00.000Z' },
      { homeTeam: 'Nottingham Forest', awayTeam: 'West Ham United', kickoff: '2025-08-30T13:00:00.000Z' },
      { homeTeam: 'Liverpool', awayTeam: 'Arsenal', kickoff: '2025-08-30T15:30:00.000Z' },
      { homeTeam: 'Aston Villa', awayTeam: 'Crystal Palace', kickoff: '2025-08-30T18:00:00.000Z' }
    ];
    
    console.log(`📅 Updating ${fixtureUpdates.length} GW3 fixtures to past times...`);
    
    for (const fixtureUpdate of fixtureUpdates) {
      const existingFixture = await prisma.fixture.findFirst({
        where: { 
          gameweekId: gw3.id,
          homeTeam: fixtureUpdate.homeTeam,
          awayTeam: fixtureUpdate.awayTeam
        }
      });
      
      if (existingFixture) {
        console.log(`✅ Updating fixture: ${fixtureUpdate.homeTeam} vs ${fixtureUpdate.awayTeam}`);
        await prisma.fixture.update({
          where: { id: existingFixture.id },
          data: {
            kickoff: new Date(fixtureUpdate.kickoff),
            status: 'SCHEDULED'
          }
        });
      } else {
        console.log(`⚠️ Fixture not found: ${fixtureUpdate.homeTeam} vs ${fixtureUpdate.awayTeam}`);
      }
    }
    
    // Verify all fixtures are now in the past
    const updatedFixtures = await prisma.fixture.findMany({
      where: { gameweekId: gw3.id },
      orderBy: { kickoff: 'asc' }
    });
    
    console.log(`\n🔍 Verification - All GW3 fixtures should now be in the past:`);
    
    updatedFixtures.forEach(fixture => {
      const kickoffDate = new Date(fixture.kickoff);
      const now = new Date();
      const isPast = kickoffDate < now;
      const status = isPast ? '⏰ PAST' : '⏳ FUTURE';
      console.log(`  ${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.kickoff} ${status}`);
    });
    
    const allPast = updatedFixtures.every(f => new Date(f.kickoff) < new Date());
    console.log(`\n✅ All GW3 fixtures are now in the past: ${allPast ? 'YES' : 'NO'}`);
    
    if (allPast) {
      console.log('🎉 GW3 should now properly trigger as current gameweek!');
      console.log('🔍 This should show team crests on dashboard and picks in results');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch(e => { 
    console.error('❌ Script failed:', e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });
