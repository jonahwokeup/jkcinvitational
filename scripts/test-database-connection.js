const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test 1: Basic connection
    console.log('\n1️⃣ Testing basic connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test 2: Check if users exist
    console.log('\n2️⃣ Checking users...')
    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`)
    })
    
    // Test 3: Check if competition exists
    console.log('\n3️⃣ Checking competition...')
    const competition = await prisma.competition.findFirst()
    if (competition) {
      console.log(`✅ Competition found: ${competition.name}`)
      
      // Check gameweeks
      const gameweeks = await prisma.gameweek.findMany({
        where: { competitionId: competition.id }
      })
      console.log(`Found ${gameweeks.length} gameweeks`)
      
      // Check entries
      const entries = await prisma.entry.findMany({
        where: { competitionId: competition.id },
        include: { user: true }
      })
      console.log(`Found ${entries.length} entries`)
    } else {
      console.log('❌ No competition found')
    }
    
    // Test 4: Test specific access code
    console.log('\n4️⃣ Testing access code lookup...')
    const testCode = '651890'
    console.log(`Testing code: ${testCode}`)
    
    // This simulates what happens in auth.ts
    const ACCESS_CODES = {
      "651890": { email: "jonah@jkc.com", name: "Jonah McGowan" },
      "690077": { email: "max@jkc.com", name: "Max Reid" },
      "368740": { email: "abboud@jkc.com", name: "Abboud Hammour" },
      "247324": { email: "chris@jkc.com", name: "Chris Grube" },
    }
    
    const userInfo = ACCESS_CODES[testCode]
    if (userInfo) {
      console.log(`✅ Code ${testCode} maps to: ${userInfo.name} (${userInfo.email})`)
      
      // Check if user exists in database
      const user = await prisma.user.findUnique({
        where: { email: userInfo.email }
      })
      
      if (user) {
        console.log(`✅ User found in database: ${user.name}`)
      } else {
        console.log(`❌ User NOT found in database`)
      }
    } else {
      console.log(`❌ Code ${testCode} not found in ACCESS_CODES`)
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseConnection()
