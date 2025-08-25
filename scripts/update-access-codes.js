const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Generate random 6-digit codes
function generateRandomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function updateAccessCodes() {
  try {
    console.log('🔐 Generating new random 6-digit access codes...')
    
    // Get all users
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'jonah@jkc.com',
            'max@jkc.com', 
            'abboud@jkc.com',
            'chris@jkc.com'
          ]
        }
      }
    })
    
    console.log(`Found ${users.length} users`)
    
    // Generate new codes for each user
    const newCodes = {}
    const usedCodes = new Set()
    
    for (const user of users) {
      let code
      do {
        code = generateRandomCode()
      } while (usedCodes.has(code))
      
      usedCodes.add(code)
      newCodes[user.email] = code
      
      console.log(`${user.name} (${user.email}): ${code}`)
    }
    
    // Update auth.ts file
    console.log('\n📝 Updating auth.ts file...')
    
    // Read the current auth.ts file
    const fs = require('fs')
    const path = require('path')
    const authFilePath = path.join(__dirname, '../src/lib/auth.ts')
    
    let authContent = fs.readFileSync(authFilePath, 'utf8')
    
    // Create new ACCESS_CODES object
    const newAccessCodes = `const ACCESS_CODES = {
  "${newCodes['jonah@jkc.com']}": { email: "jonah@jkc.com", name: "Jonah McGowan" },
  "${newCodes['max@jkc.com']}": { email: "max@jkc.com", name: "Max Reid" },
  "${newCodes['abboud@jkc.com']}": { email: "abboud@jkc.com", name: "Abboud Hammour" },
  "${newCodes['chris@jkc.com']}": { email: "chris@jkc.com", name: "Chris Grube" },
}`
    
    // Replace the old ACCESS_CODES with new one
    const oldAccessCodesRegex = /const ACCESS_CODES = \{[\s\S]*?\}/
    authContent = authContent.replace(oldAccessCodesRegex, newAccessCodes)
    
    // Write the updated file
    fs.writeFileSync(authFilePath, authContent)
    
    console.log('✅ auth.ts file updated successfully!')
    console.log('\n🎯 New Access Codes:')
    console.log('=====================')
    for (const [email, code] of Object.entries(newCodes)) {
      const user = users.find(u => u.email === email)
      console.log(`${user.name}: ${code}`)
    }
    
    console.log('\n📋 Please save these codes somewhere safe - they will never change!')
    
  } catch (error) {
    console.error('❌ Error updating access codes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAccessCodes()
