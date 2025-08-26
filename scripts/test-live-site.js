const https = require('https')

async function testLiveSite() {
  try {
    console.log('🔍 Testing live site database connection...')
    
    // Test 1: Check if the site is responding
    console.log('\n1️⃣ Testing site response...')
    
    const response = await new Promise((resolve, reject) => {
      https.get('https://jkcinvitational.vercel.app', (res) => {
        resolve({ statusCode: res.statusCode, headers: res.headers })
      }).on('error', (err) => {
        reject(err)
      })
    })
    
    console.log(`✅ Site responding: ${response.statusCode}`)
    
    // Test 2: Try to access a protected route to see what error we get
    console.log('\n2️⃣ Testing authentication endpoint...')
    
    const authResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        accessCode: '651890'
      })
      
      const options = {
        hostname: 'jkcinvitational.vercel.app',
        port: 443,
        path: '/api/auth/callback/credentials',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }
      
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data })
        })
      })
      
      req.on('error', (err) => {
        reject(err)
      })
      
      req.write(postData)
      req.end()
    })
    
    console.log(`📊 Auth endpoint status: ${authResponse.statusCode}`)
    console.log(`📄 Auth response: ${authResponse.data}`)
    
    if (authResponse.statusCode === 401) {
      console.log('❌ Still getting 401 Unauthorized')
      console.log('🔍 This suggests environment variables or database connection issue')
    } else if (authResponse.statusCode === 200) {
      console.log('✅ Authentication working!')
    } else if (authResponse.statusCode === 302) {
      console.log('🔄 Getting 302 Redirect - checking response headers...')
      console.log('📋 Response headers:', JSON.stringify(authResponse.headers, null, 2))
      console.log('🔍 302 usually means redirect - this might be NextAuth working!')
    } else {
      console.log(`❓ Unexpected status: ${authResponse.statusCode}`)
    }
    
  } catch (error) {
    console.error('❌ Error testing live site:', error.message)
  }
}

testLiveSite()
