const https = require('https')

async function checkDeployedCodes() {
  try {
    console.log('🔍 Checking what access codes are actually deployed...')
    
    const url = 'https://jkcinvitational.vercel.app/api/auth/session'
    
    console.log(`\n📡 Making request to: ${url}`)
    
    const response = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data })
        })
      }).on('error', (err) => {
        reject(err)
      })
    })
    
    console.log(`\n📊 Response Status: ${response.statusCode}`)
    console.log(`📄 Response Data: ${response.data}`)
    
    // Also check the sign-in page to see what's displayed
    console.log('\n🌐 Checking sign-in page for access codes...')
    
    const signInPageResponse = await new Promise((resolve, reject) => {
      https.get('https://jkcinvitational.vercel.app/auth/signin', (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data })
        })
      }).on('error', (err) => {
        reject(err)
      })
    })
    
    console.log(`\n📊 Sign-In Page Status: ${signInPageResponse.statusCode}`)
    
    // Look for access codes in the HTML
    const html = signInPageResponse.data
    if (html.includes('JKC001') || html.includes('JKC002')) {
      console.log('❌ OLD ACCESS CODES FOUND: JKC001, JKC002, etc.')
    } else if (html.includes('651890') || html.includes('690077')) {
      console.log('✅ NEW ACCESS CODES FOUND: 651890, 690077, etc.')
    } else {
      console.log('❓ NO ACCESS CODES FOUND in HTML')
    }
    
  } catch (error) {
    console.error('❌ Error checking deployed codes:', error)
  }
}

checkDeployedCodes()
