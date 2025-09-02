const { PrismaClient } = require('@prisma/client')

// This simulates the Vercel environment
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function testVercelDatabase() {
  try {
    console.log('🔍 Testing database connection with Vercel-style setup...')
    
    // Test basic connection
    console.log('📡 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Test the exact query that's failing in production
    console.log('📋 Testing the competition query that fails in production...')
    try {
      const competitions = await prisma.competition.findMany({
        take: 1,
        include: {
          rounds: {
            where: { endedAt: null },
            include: {
              entries: {
                include: {
                  user: true,
                  picks: {
                    include: {
                      gameweek: true,
                      fixture: true,
                    },
                  },
                  exactoPredictions: {
                    include: {
                      fixture: true,
                    },
                  },
                },
              },
            },
          },
          gameweeks: {
            orderBy: { gameweekNumber: 'asc' },
            include: {
              fixtures: {
                orderBy: { kickoff: 'asc' }
              }
            }
          },
        },
      })
      console.log('✅ Competition query successful!')
      console.log(`   Found ${competitions.length} competitions`)
      if (competitions.length > 0) {
        const comp = competitions[0]
        console.log(`   Competition: ${comp.name}`)
        console.log(`   Rounds: ${comp.rounds?.length || 0}`)
        console.log(`   Gameweeks: ${comp.gameweeks?.length || 0}`)
      }
    } catch (error) {
      console.error('❌ Competition query failed:', error.message)
      console.error('   Full error:', error)
      return
    }
    
    console.log('🎉 All tests passed!')
    console.log('✅ The database connection should work in Vercel')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL environment variable not set')
  console.log('💡 Set it to your Supabase connection string to test')
  console.log('   Example: DATABASE_URL="postgresql://postgres:password@db.ckvakpaauvtkxvqzhhpk.supabase.co:5432/postgres"')
} else {
  console.log('📋 DATABASE_URL found, testing connection...')
  testVercelDatabase()
}
