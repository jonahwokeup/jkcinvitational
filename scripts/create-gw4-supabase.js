const { PrismaClient } = require('@prisma/client');

// Set production database URL for this script
process.env.PRODUCTION_DATABASE_URL = "postgresql://postgres.ckvakpaauvtkxvqzhhpk:survivor2644@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

const prisma = new PrismaClient({
  datasourceUrl: process.env.PRODUCTION_DATABASE_URL
});

async function main() {
  console.log('🎯 Creating GW4 in Supabase production database...');
  
  try {
    const competition = await prisma.competition.findFirst({ 
      where: { name: 'JKC Invitational' } 
    });
    
    if (!competition) {
      throw new Error('Competition not found');
    }
    
    console.log(`✅ Found competition: ${competition.name}`);
    
    // Check if GW4 already exists
    const existingGW4 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id, 
        gameweekNumber: 4 
      }
    });
    
    if (existingGW4) {
      console.log('⚠️ GW4 already exists, skipping creation...');
      return existingGW4;
    }
    
    // Get GW3 to calculate GW4 lock time
    const gw3 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id, 
        gameweekNumber: 3 
      }
    });
    
    if (!gw3) {
      throw new Error('GW3 not found - cannot calculate GW4 timing');
    }
    
    // Calculate GW4 lock time (7 days after GW3 lock time)
    const gw4LockTime = new Date(gw3.lockTime);
    gw4LockTime.setDate(gw4LockTime.getDate() + 7);
    
    console.log(`📅 GW3 lock time: ${gw3.lockTime}`);
    console.log(`📅 Calculated GW4 lock time: ${gw4LockTime}`);
    
    // Create GW4
    const gw4 = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: 4,
        lockTime: gw4LockTime,
        isSettled: false
      }
    });
    
    console.log(`✅ Created GW4 with ID: ${gw4.id}`);
    console.log(`📊 GW4 lock time: ${gw4.lockTime}`);
    console.log(`🔒 Status: Not Settled`);
    
    return gw4;
    
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
