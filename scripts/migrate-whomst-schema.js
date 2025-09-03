const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function migrateWhomstSchema() {
  try {
    console.log('🚀 Starting Whomst schema migration...');
    
    // Check if TiebreakParticipant table exists
    const tiebreakParticipantExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'TiebreakParticipant'
      );
    `;
    
    console.log('TiebreakParticipant table exists:', tiebreakParticipantExists[0].exists);
    
    if (!tiebreakParticipantExists[0].exists) {
      console.log('📝 Creating TiebreakParticipant table...');
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
      
      console.log('✅ TiebreakParticipant table created');
    }
    
    // Check if WhomstScore table exists
    const whomstScoreExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'WhomstScore'
      );
    `;
    
    console.log('WhomstScore table exists:', whomstScoreExists[0].exists);
    
    if (!whomstScoreExists[0].exists) {
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
      
      console.log('✅ WhomstScore table created');
    }
    
    // Check if ExactoPrediction table exists
    const exactoPredictionExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ExactoPrediction'
      );
    `;
    
    console.log('ExactoPrediction table exists:', exactoPredictionExists[0].exists);
    
    if (!exactoPredictionExists[0].exists) {
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
      
      console.log('✅ ExactoPrediction table created');
    }
    
    // Check if Round table has the new tiebreak columns
    const roundColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Round' 
      AND table_schema = 'public'
      AND column_name IN ('tiebreakStatus', 'tiebreakType', 'tiebreakStage', 'tiebreakDeadline');
    `;
    
    const existingColumns = roundColumns.map(row => row.column_name);
    console.log('Existing Round tiebreak columns:', existingColumns);
    
    if (!existingColumns.includes('tiebreakStatus')) {
      console.log('📝 Adding tiebreakStatus column to Round...');
      await prisma.$executeRaw`
        ALTER TABLE "Round" ADD COLUMN "tiebreakStatus" "TiebreakStatus" NOT NULL DEFAULT 'none';
      `;
    }
    
    if (!existingColumns.includes('tiebreakType')) {
      console.log('📝 Adding tiebreakType column to Round...');
      await prisma.$executeRaw`
        ALTER TABLE "Round" ADD COLUMN "tiebreakType" "TiebreakType" NOT NULL DEFAULT 'none';
      `;
    }
    
    if (!existingColumns.includes('tiebreakStage')) {
      console.log('📝 Adding tiebreakStage column to Round...');
      await prisma.$executeRaw`
        ALTER TABLE "Round" ADD COLUMN "tiebreakStage" INTEGER;
      `;
    }
    
    if (!existingColumns.includes('tiebreakDeadline')) {
      console.log('📝 Adding tiebreakDeadline column to Round...');
      await prisma.$executeRaw`
        ALTER TABLE "Round" ADD COLUMN "tiebreakDeadline" TIMESTAMP(3);
      `;
    }
    
    // Check if Entry table has the new exacto columns
    const entryColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Entry' 
      AND table_schema = 'public'
      AND column_name IN ('usedExacto', 'exactoSuccess');
    `;
    
    const existingEntryColumns = entryColumns.map(row => row.column_name);
    console.log('Existing Entry exacto columns:', existingEntryColumns);
    
    if (!existingEntryColumns.includes('usedExacto')) {
      console.log('📝 Adding usedExacto column to Entry...');
      await prisma.$executeRaw`
        ALTER TABLE "Entry" ADD COLUMN "usedExacto" BOOLEAN NOT NULL DEFAULT false;
      `;
    }
    
    if (!existingEntryColumns.includes('exactoSuccess')) {
      console.log('📝 Adding exactoSuccess column to Entry...');
      await prisma.$executeRaw`
        ALTER TABLE "Entry" ADD COLUMN "exactoSuccess" INTEGER NOT NULL DEFAULT 0;
      `;
    }
    
    // Check if TiebreakStatus enum exists
    const tiebreakStatusEnumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'TiebreakStatus'
      );
    `;
    
    if (!tiebreakStatusEnumExists[0].exists) {
      console.log('📝 Creating TiebreakStatus enum...');
      await prisma.$executeRaw`
        CREATE TYPE "TiebreakStatus" AS ENUM ('none', 'pending', 'in_progress', 'completed');
      `;
    }
    
    // Check if TiebreakType enum exists
    const tiebreakTypeEnumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'TiebreakType'
      );
    `;
    
    if (!tiebreakTypeEnumExists[0].exists) {
      console.log('📝 Creating TiebreakType enum...');
      await prisma.$executeRaw`
        CREATE TYPE "TiebreakType" AS ENUM ('none', 'whomst');
      `;
    }
    
    console.log('✅ Whomst schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateWhomstSchema()
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
