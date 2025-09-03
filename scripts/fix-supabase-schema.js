const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fixSupabaseSchema() {
  try {
    console.log('🔧 Fixing Supabase schema to match Prisma...');
    
    // 1. Drop the incorrect TiebreakStatus enum and recreate with correct values
    console.log('📝 Recreating TiebreakStatus enum...');
    await prisma.$executeRaw`DROP TYPE IF EXISTS "TiebreakStatus" CASCADE;`;
    await prisma.$executeRaw`CREATE TYPE "TiebreakStatus" AS ENUM ('none', 'pending', 'in_progress', 'completed');`;
    
    // 2. Create TiebreakType enum
    console.log('📝 Creating TiebreakType enum...');
    await prisma.$executeRaw`DROP TYPE IF EXISTS "TiebreakType" CASCADE;`;
    await prisma.$executeRaw`CREATE TYPE "TiebreakType" AS ENUM ('none', 'whomst');`;
    
    // 3. Drop the incorrect Tiebreak table
    console.log('📝 Dropping incorrect Tiebreak table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS "Tiebreak" CASCADE;`;
    
    // 4. Drop the incorrect TiebreakParticipant table
    console.log('📝 Dropping incorrect TiebreakParticipant table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS "TiebreakParticipant" CASCADE;`;
    
    // 5. Fix the Round table columns
    console.log('📝 Fixing Round table columns...');
    await prisma.$executeRaw`ALTER TABLE "Round" DROP COLUMN IF EXISTS "tiebreakStatus";`;
    await prisma.$executeRaw`ALTER TABLE "Round" ADD COLUMN "tiebreakStatus" "TiebreakStatus" NOT NULL DEFAULT 'none';`;
    await prisma.$executeRaw`ALTER TABLE "Round" ADD COLUMN "tiebreakType" "TiebreakType" NOT NULL DEFAULT 'none';`;
    await prisma.$executeRaw`ALTER TABLE "Round" ADD COLUMN "tiebreakStage" INTEGER;`;
    await prisma.$executeRaw`ALTER TABLE "Round" ADD COLUMN "tiebreakDeadline" TIMESTAMP(3);`;
    
    // 6. Add missing Entry table columns
    console.log('📝 Adding Entry table columns...');
    await prisma.$executeRaw`ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "usedExacto" BOOLEAN NOT NULL DEFAULT false;`;
    await prisma.$executeRaw`ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "exactoSuccess" INTEGER NOT NULL DEFAULT 0;`;
    
    // 7. Create correct TiebreakParticipant table
    console.log('📝 Creating correct TiebreakParticipant table...');
    await prisma.$executeRaw`
      CREATE TABLE "TiebreakParticipant" (
        "id" TEXT NOT NULL,
        "roundId" TEXT NOT NULL,
        "entryId" TEXT NOT NULL,
        "stage" INTEGER NOT NULL,
        "score" INTEGER,
        "attemptUsed" BOOLEAN NOT NULL DEFAULT false,
        "submittedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TiebreakParticipant_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "TiebreakParticipant_roundId_entryId_stage_key" ON "TiebreakParticipant"("roundId", "entryId", "stage");
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "TiebreakParticipant" ADD CONSTRAINT "TiebreakParticipant_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "TiebreakParticipant" ADD CONSTRAINT "TiebreakParticipant_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    // 8. Create WhomstScore table
    console.log('📝 Creating WhomstScore table...');
    await prisma.$executeRaw`
      CREATE TABLE "WhomstScore" (
        "id" TEXT NOT NULL,
        "entryId" TEXT NOT NULL,
        "competitionId" TEXT NOT NULL,
        "score" INTEGER NOT NULL,
        "gameType" TEXT NOT NULL DEFAULT 'fun',
        "roundId" TEXT,
        "stage" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WhomstScore_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX "WhomstScore_competitionId_score_idx" ON "WhomstScore"("competitionId", "score");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX "WhomstScore_entryId_score_idx" ON "WhomstScore"("entryId", "score");
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "WhomstScore" ADD CONSTRAINT "WhomstScore_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "WhomstScore" ADD CONSTRAINT "WhomstScore_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "WhomstScore" ADD CONSTRAINT "WhomstScore_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    // 9. Create ExactoPrediction table
    console.log('📝 Creating ExactoPrediction table...');
    await prisma.$executeRaw`
      CREATE TABLE "ExactoPrediction" (
        "id" TEXT NOT NULL,
        "entryId" TEXT NOT NULL,
        "gameweekId" TEXT NOT NULL,
        "fixtureId" TEXT NOT NULL,
        "homeGoals" INTEGER NOT NULL,
        "awayGoals" INTEGER NOT NULL,
        "isCorrect" BOOLEAN,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ExactoPrediction_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "ExactoPrediction_entryId_gameweekId_key" ON "ExactoPrediction"("entryId", "gameweekId");
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "ExactoPrediction" ADD CONSTRAINT "ExactoPrediction_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "ExactoPrediction" ADD CONSTRAINT "ExactoPrediction_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "ExactoPrediction" ADD CONSTRAINT "ExactoPrediction_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    console.log('✅ Supabase schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixSupabaseSchema()
  .catch((error) => {
    console.error('Schema fix script failed:', error);
    process.exit(1);
  });
