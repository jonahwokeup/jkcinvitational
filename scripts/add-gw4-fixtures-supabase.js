const { PrismaClient } = require('@prisma/client');

// Set production database URL for this script
process.env.PRODUCTION_DATABASE_URL = "postgresql://postgres.ckvakpaauvtkxvqzhhpk:survivor2644@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

const prisma = new PrismaClient({
  datasourceUrl: process.env.PRODUCTION_DATABASE_URL
});

async function main() {
  console.log('🎯 Adding all GW4 fixtures to Supabase production database...');
  
  try {
    const competition = await prisma.competition.findFirst({ 
      where: { name: 'JKC Invitational' } 
    });
    
    if (!competition) {
      throw new Error('Competition not found');
    }
    
    console.log(`✅ Found competition: ${competition.name}`);
    
    const gw4 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id, 
        gameweekNumber: 4 
      }
    });
    
    if (!gw4) {
      throw new Error('Gameweek 4 not found');
    }
    
    console.log(`✅ Found GW4: ${gw4.gameweekNumber}`);
    
    const fixtures = [
      { homeTeam: 'Arsenal', awayTeam: 'Nottingham Forest', kickoff: '2025-09-13T11:30:00.000Z' },
      { homeTeam: 'Bournemouth', awayTeam: 'Brighton & Hove Albion', kickoff: '2025-09-13T14:00:00.000Z' },
      { homeTeam: 'Crystal Palace', awayTeam: 'Sunderland', kickoff: '2025-09-13T14:00:00.000Z' },
      { homeTeam: 'Everton', awayTeam: 'Aston Villa', kickoff: '2025-09-13T14:00:00.000Z' },
      { homeTeam: 'Fulham', awayTeam: 'Leeds United', kickoff: '2025-09-13T14:00:00.000Z' },
      { homeTeam: 'Newcastle United', awayTeam: 'Wolverhampton Wanderers', kickoff: '2025-09-13T14:00:00.000Z' },
      { homeTeam: 'West Ham United', awayTeam: 'Tottenham Hotspur', kickoff: '2025-09-13T16:30:00.000Z' },
      { homeTeam: 'Brentford', awayTeam: 'Chelsea', kickoff: '2025-09-13T19:00:00.000Z' },
      { homeTeam: 'Burnley', awayTeam: 'Liverpool', kickoff: '2025-09-14T13:00:00.000Z' },
      { homeTeam: 'Manchester City', awayTeam: 'Manchester United', kickoff: '2025-09-14T15:30:00.000Z' }
    ];
    
    console.log(`📅 Adding ${fixtures.length} fixtures to GW4...`);
    
    for (const fixture of fixtures) {
      const existingFixture = await prisma.fixture.findFirst({
        where: { 
          gameweekId: gw4.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam
        }
      });
      
      if (existingFixture) {
        console.log(`⚠️ Updating existing fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
        await prisma.fixture.update({
          where: { id: existingFixture.id },
          data: {
            kickoff: new Date(fixture.kickoff),
            status: 'SCHEDULED'
          }
        });
      } else {
        console.log(`✅ Creating fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
        await prisma.fixture.create({
          data: {
            gameweekId: gw4.id,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            kickoff: new Date(fixture.kickoff),
            status: 'SCHEDULED'
          }
        });
      }
    }
    
    const finalCount = await prisma.fixture.count({
      where: { gameweekId: gw4.id }
    });
    
    console.log(`\n🎉 GW4 now has ${finalCount} fixtures in Supabase!`);
    console.log('📊 All GW4 fixtures have been added/updated to production database');
    
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
