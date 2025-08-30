const { PrismaClient } = require('@prisma/client');

// Set production database URL for this script
process.env.PRODUCTION_DATABASE_URL = "postgresql://postgres.ckvakpaauvtkxvqzhhpk:survivor2644@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

const prisma = new PrismaClient({
  datasourceUrl: process.env.PRODUCTION_DATABASE_URL
});

async function main() {
  console.log('🎯 Fixing GW4 fixture kickoff times to correct EST times...');
  
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
      },
      include: { fixtures: true }
    });
    
    if (!gw4) {
      throw new Error('Gameweek 4 not found');
    }
    
    console.log(`✅ Found GW4: ${gw4.gameweekNumber}`);
    console.log(`📅 Current fixtures: ${gw4.fixtures.length}`);
    
    // Correct EST times from the image (converted to UTC)
    // EST is UTC-4, so 07:30 EST = 11:30 UTC, 10:00 EST = 14:00 UTC, etc.
    const correctTimes = [
      { homeTeam: 'Arsenal', awayTeam: 'Nottingham Forest', kickoff: '2025-09-13T11:30:00.000Z' }, // 07:30 EST
      { homeTeam: 'Bournemouth', awayTeam: 'Brighton & Hove Albion', kickoff: '2025-09-13T14:00:00.000Z' }, // 10:00 EST
      { homeTeam: 'Crystal Palace', awayTeam: 'Sunderland', kickoff: '2025-09-13T14:00:00.000Z' }, // 10:00 EST
      { homeTeam: 'Everton', awayTeam: 'Aston Villa', kickoff: '2025-09-13T14:00:00.000Z' }, // 10:00 EST
      { homeTeam: 'Fulham', awayTeam: 'Leeds United', kickoff: '2025-09-13T14:00:00.000Z' }, // 10:00 EST
      { homeTeam: 'Newcastle United', awayTeam: 'Wolverhampton Wanderers', kickoff: '2025-09-13T14:00:00.000Z' }, // 10:00 EST
      { homeTeam: 'West Ham United', awayTeam: 'Tottenham Hotspur', kickoff: '2025-09-13T16:30:00.000Z' }, // 12:30 EST
      { homeTeam: 'Brentford', awayTeam: 'Chelsea', kickoff: '2025-09-13T19:00:00.000Z' }, // 15:00 EST
      { homeTeam: 'Burnley', awayTeam: 'Liverpool', kickoff: '2025-09-14T13:00:00.000Z' }, // 09:00 EST
      { homeTeam: 'Manchester City', awayTeam: 'Manchester United', kickoff: '2025-09-14T15:30:00.000Z' } // 11:30 EST
    ];
    
    console.log(`📅 Updating ${correctTimes.length} fixtures with correct EST times...`);
    
    for (const correctTime of correctTimes) {
      const fixture = gw4.fixtures.find(f => 
        f.homeTeam === correctTime.homeTeam && f.awayTeam === correctTime.awayTeam
      );
      
      if (fixture) {
        const oldTime = new Date(fixture.kickoff);
        const newTime = new Date(correctTime.kickoff);
        
        console.log(`✅ Updating ${fixture.homeTeam} vs ${fixture.awayTeam}:`);
        console.log(`   Old: ${oldTime.toLocaleString()} (${oldTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} EST)`);
        console.log(`   New: ${newTime.toLocaleString()} (${newTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} EST)`);
        
        await prisma.fixture.update({
          where: { id: fixture.id },
          data: {
            kickoff: newTime
          }
        });
      } else {
        console.log(`⚠️ Fixture not found: ${correctTime.homeTeam} vs ${correctTime.awayTeam}`);
      }
    }
    
    // Verify the updates
    const updatedFixtures = await prisma.fixture.findMany({
      where: { gameweekId: gw4.id },
      orderBy: { kickoff: 'asc' }
    });
    
    console.log(`\n🎉 GW4 fixtures updated! Here are the corrected times:`);
    
    updatedFixtures.forEach(fixture => {
      const kickoffDate = new Date(fixture.kickoff);
      const estTime = kickoffDate.toLocaleTimeString('en-US', { 
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit'
      });
      const utcTime = kickoffDate.toLocaleTimeString('en-US', { 
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`  ${fixture.homeTeam} vs ${fixture.awayTeam}: ${estTime} EST (${utcTime} UTC)`);
    });
    
    console.log('\n✅ All GW4 fixture times have been corrected to match the official schedule!');
    
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
