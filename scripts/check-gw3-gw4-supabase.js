const { PrismaClient } = require('@prisma/client');

// Set production database URL for this script
process.env.PRODUCTION_DATABASE_URL = "postgresql://postgres.ckvakpaauvtkxvqzhhpk:survivor2644@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

const prisma = new PrismaClient({
  datasourceUrl: process.env.PRODUCTION_DATABASE_URL
});

async function main() {
  console.log('🔍 Checking GW3 and GW4 in Supabase production database...');
  
  try {
    const competition = await prisma.competition.findFirst({ 
      where: { name: 'JKC Invitational' } 
    });
    
    if (!competition) {
      throw new Error('Competition not found');
    }
    
    console.log(`\n📊 Competition: ${competition.name} (${competition.season})`);
    
    // Check GW3
    const gw3 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id, 
        gameweekNumber: 3 
      },
      include: { 
        fixtures: {
          orderBy: { kickoff: 'asc' }
        }
      }
    });
    
    if (gw3) {
      console.log(`\n🎯 Gameweek 3:`);
      console.log(`  🔒 Lock time: ${gw3.lockTime}`);
      console.log(`  📊 Status: ${gw3.isSettled ? 'Settled' : 'Not Settled'}`);
      console.log(`  🏟️ Fixtures: ${gw3.fixtures.length}`);
      
      if (gw3.fixtures.length > 0) {
        gw3.fixtures.forEach(fixture => {
          const kickoffDate = new Date(fixture.kickoff);
          const now = new Date();
          const isPast = kickoffDate < now;
          const status = isPast ? '⏰ PAST' : '⏳ FUTURE';
          console.log(`    ${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.kickoff} (${fixture.status}) ${status}`);
        });
      }
      
      // Check if GW3 should be current
      const hasPastFixtures = gw3.fixtures.some(f => new Date(f.kickoff) < new Date());
      console.log(`\n🔍 GW3 Analysis:`);
      console.log(`  - Has past fixtures: ${hasPastFixtures ? 'YES' : 'NO'}`);
      console.log(`  - Should be current: ${hasPastFixtures ? 'YES' : 'NO'}`);
    } else {
      console.log('\n❌ Gameweek 3 not found');
    }
    
    // Check GW4
    const gw4 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id, 
        gameweekNumber: 4 
      },
      include: { 
        fixtures: {
          orderBy: { kickoff: 'asc' }
        }
      }
    });
    
    if (gw4) {
      console.log(`\n🎯 Gameweek 4:`);
      console.log(`  🔒 Lock time: ${gw4.lockTime}`);
      console.log(`  📊 Status: ${gw4.isSettled ? 'Settled' : 'Not Settled'}`);
      console.log(`  🏟️ Fixtures: ${gw4.fixtures.length}`);
      
      if (gw4.fixtures.length > 0) {
        gw4.fixtures.forEach(fixture => {
          const kickoffDate = new Date(fixture.kickoff);
          const now = new Date();
          const isPast = kickoffDate < now;
          const status = isPast ? '⏰ PAST' : '⏳ FUTURE';
          console.log(`    ${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.kickoff} (${fixture.status}) ${status}`);
        });
      }
    } else {
      console.log('\n❌ Gameweek 4 not found');
    }
    
    // Overall current gameweek detection
    const allGameweeks = await prisma.gameweek.findMany({
      where: { competitionId: competition.id },
      include: { fixtures: true }
    });
    
    const currentGameweek = allGameweeks.find(gw => 
      !gw.isSettled && 
      gw.fixtures.some(f => new Date(f.kickoff) < new Date())
    );
    
    if (currentGameweek) {
      console.log(`\n🟡 CURRENT GAMEWEEK DETECTED: GW${currentGameweek.gameweekNumber}`);
      console.log(`   This should show team crests on dashboard and picks in results`);
    } else {
      console.log(`\n❌ NO CURRENT GAMEWEEK DETECTED`);
      console.log(`   This explains why custom images are still showing`);
    }
    
    console.log('\n✅ Check complete');
    
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
