const { PrismaClient } = require('@prisma/client');

// Set production database URL for this script
process.env.PRODUCTION_DATABASE_URL = "postgresql://postgres.ckvakpaauvtkxvqzhhpk:survivor2644@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

const prisma = new PrismaClient({
  datasourceUrl: process.env.PRODUCTION_DATABASE_URL
});

async function main() {
  console.log('🔍 Checking Supabase production database structure...');
  
  try {
    const competition = await prisma.competition.findFirst({ 
      where: { name: 'JKC Invitational' } 
    });
    
    if (!competition) {
      throw new Error('Competition not found');
    }
    
    console.log(`\n📊 Competition: ${competition.name} (${competition.season})`);
    
    const gameweeks = await prisma.gameweek.findMany({
      where: { competitionId: competition.id },
      include: { 
        fixtures: {
          orderBy: { kickoff: 'asc' }
        }
      },
      orderBy: { gameweekNumber: 'asc' }
    });
    
    console.log(`📅 Total gameweeks: ${gameweeks.length}`);
    
    gameweeks.forEach(gw => {
      console.log(`\n🎯 Gameweek ${gw.gameweekNumber}:`);
      console.log(`  🔒 Lock time: ${gw.lockTime}`);
      console.log(`  📊 Status: ${gw.isSettled ? 'Settled' : 'Not Settled'}`);
      console.log(`  🏟️ Fixtures: ${gw.fixtures.length}`);
      
      if (gw.fixtures.length > 0) {
        gw.fixtures.forEach(fixture => {
          const kickoffDate = new Date(fixture.kickoff);
          const now = new Date();
          const isPast = kickoffDate < now;
          const status = isPast ? '⏰ PAST' : '⏳ FUTURE';
          console.log(`    ${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.kickoff} (${fixture.status}) ${status}`);
        });
      }
    });
    
    // Check for current gameweek detection
    const currentGameweek = gameweeks.find(gw => 
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
    
    // Check for missing gameweeks
    const expectedNumbers = [];
    for (let i = 1; i <= Math.max(...gameweeks.map(gw => gw.gameweekNumber)); i++) {
      expectedNumbers.push(i);
    }
    
    const actualNumbers = gameweeks.map(gw => gw.gameweekNumber);
    const missingNumbers = expectedNumbers.filter(num => !actualNumbers.includes(num));
    
    if (missingNumbers.length > 0) {
      console.log(`\n⚠️ Missing gameweek numbers: ${missingNumbers.join(', ')}`);
    } else {
      console.log('\n✅ All expected gameweek numbers are present');
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
