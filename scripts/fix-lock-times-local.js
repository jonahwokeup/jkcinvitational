const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')

async function fixLockTimes() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err)
        reject(err)
        return
      }
      console.log('🕐 Connected to SQLite database')
    })

    // Get all gameweeks
    db.all("SELECT id, gameweekNumber, lockTime, isSettled FROM Gameweek ORDER BY gameweekNumber", (err, gameweeks) => {
      if (err) {
        console.error('Error getting gameweeks:', err)
        reject(err)
        return
      }

      console.log(`📊 Found ${gameweeks.length} gameweeks`)

      let completed = 0
      const total = gameweeks.length

      gameweeks.forEach((gw) => {
        console.log(`\n📅 Processing GW${gw.gameweekNumber}...`)

        // Set lock times to be in the future relative to current date
        const now = new Date()
        let newLockTime
        let isSettled

        if (gw.gameweekNumber <= 3) {
          // Past gameweeks - set lock time to past
          newLockTime = new Date(now.getTime() - (4 - gw.gameweekNumber) * 7 * 24 * 60 * 60 * 1000)
          isSettled = 1
        } else if (gw.gameweekNumber === 4) {
          // Current gameweek - set lock time to 1 hour ago
          newLockTime = new Date(now.getTime() - 60 * 60 * 1000)
          isSettled = 0
        } else {
          // Future gameweeks - set lock time to future
          newLockTime = new Date(now.getTime() + (gw.gameweekNumber - 4) * 7 * 24 * 60 * 60 * 1000)
          isSettled = 0
        }

        // Update the gameweek
        db.run(`
          UPDATE Gameweek 
          SET lockTime = ?, isSettled = ?, updatedAt = ?
          WHERE id = ?
        `, [
          newLockTime.getTime(),
          isSettled,
          Date.now(),
          gw.id
        ], function(err) {
          if (err) {
            console.error(`Error updating GW${gw.gameweekNumber}:`, err)
            reject(err)
            return
          }

          console.log(`   ✅ Updated lock time to: ${newLockTime.toISOString()}`)
          console.log(`   ✅ Settled status: ${isSettled ? 'Yes' : 'No'}`)

          completed++
          if (completed === total) {
            console.log('\n✅ Lock times fixed!')
            console.log('   GW1-3: Past lock times, settled')
            console.log('   GW4: Current gameweek (lock time 1 hour ago)')
            console.log('   GW5+: Future lock times, scheduled')
            db.close()
            resolve()
          }
        })
      })
    })
  })
}

fixLockTimes()
  .then(() => {
    console.log('✅ Script completed successfully!')
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
  })
