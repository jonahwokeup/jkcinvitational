const https = require('https')

async function debugLiveSite() {
  try {
    console.log('🔍 Comprehensive Live Site Debug...')
    
    // Test 1: Basic site response
    console.log('\n1️⃣ Testing basic site response...')
    const siteResponse = await new Promise((resolve, reject) => {
      https.get('https://jkcinvitational.vercel.app', (res) => {
        resolve({ statusCode: res.statusCode })
      }).on('error', reject)
    })
    console.log(`✅ Site status: ${siteResponse.statusCode}`)
    
    // Test 2: Check if auth.ts changes are deployed
    console.log('\n2️⃣ Checking if new auth.ts is deployed...')
    const signinResponse = await new Promise((resolve, reject) => {
      https.get('https://jkcinvitational.vercel.app/auth/signin', (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => resolve({ statusCode: res.statusCode, data }))
      }).on('error', reject)
    })
    
    console.log(`📊 Sign-in page status: ${signinResponse.statusCode}`)
    
    // Look for old vs new access codes in the HTML
    const html = signinResponse.data
    if (html.includes('JKC001') || html.includes('JKC002')) {
      console.log('❌ OLD ACCESS CODES STILL DEPLOYED: JKC001, JKC002, etc.')
      console.log('🔍 This means your new auth.ts file is NOT deployed!')
    } else if (html.includes('651890') || html.includes('690077')) {
      console.log('✅ NEW ACCESS CODES DEPLOYED: 651890, 690077, etc.')
    } else {
      console.log('❓ NO ACCESS CODES FOUND in HTML')
    }
    
    // Test 3: Test authentication endpoint directly
    console.log('\n3️⃣ Testing authentication endpoint...')
    const authResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({ accessCode: '651890' })
      
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
        res.on('data', chunk => data += chunk)
        res.on('end', () => resolve({ 
          statusCode: res.statusCode, 
          data,
          headers: res.headers
        }))
      })
      
      req.on('error', reject)
      req.write(postData)
      req.end()
    })
    
    console.log(`📊 Auth endpoint status: ${authResponse.statusCode}`)
    console.log(`📄 Auth response: ${authResponse.data}`)
    
    if (authResponse.statusCode === 401) {
      console.log('❌ Still getting 401 - authentication failing')
    } else if (authResponse.statusCode === 302) {
      console.log('🔄 Getting 302 redirect - this might be working!')
    } else if (authResponse.statusCode === 200) {
      console.log('✅ Getting 200 - authentication working!')
    }
    
    // Test 4: Check environment variables are working
    console.log('\n4️⃣ Checking if environment variables are working...')
    console.log('🔍 If you get 401, it means DATABASE_URL or AUTH_SECRET not working')
    console.log('🔍 If you get 302, it means env vars are working but auth logic has issues')
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  }
}

debugLiveSite()
