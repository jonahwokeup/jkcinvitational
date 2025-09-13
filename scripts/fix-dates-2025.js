const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')

async function fixDatesTo2025() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err)
        reject(err)
        return
      }
      console.log('📅 Connected to SQLite database')
    })

    console.log('🔄 Updating all 2024 dates to 2025...\n')

    // Update all fixture kickoff times from 2024 to 2025
    db.run(`
      UPDATE Fixture 
      SET kickoff = kickoff + (365 * 24 * 60 * 60 * 1000), updatedAt = ?
      WHERE kickoff < 1735689600000
    `, [Date.now()], function(err) {
      if (err) {
        console.error('Error updating fixture dates:', err)
        reject(err)
        return
      }

      console.log(`✅ Updated ${this.changes} fixture kickoff times from 2024 to 2025`)

      // Update all gameweek lock times from 2024 to 2025
      db.run(`
        UPDATE Gameweek 
        SET lockTime = lockTime + (365 * 24 * 60 * 60 * 1000), updatedAt = ?
        WHERE lockTime < 1735689600000
      `, [Date.now()], function(err) {
        if (err) {
          console.error('Error updating gameweek lock times:', err)
          reject(err)
          return
        }

        console.log(`✅ Updated ${this.changes} gameweek lock times from 2024 to 2025`)

        // Update settledAt times from 2024 to 2025
        db.run(`
          UPDATE Gameweek 
          SET settledAt = settledAt + (365 * 24 * 60 * 60 * 1000), updatedAt = ?
          WHERE settledAt IS NOT NULL AND settledAt < 1735689600000
        `, [Date.now()], function(err) {
          if (err) {
            console.error('Error updating settledAt times:', err)
            reject(err)
            return
          }

          console.log(`✅ Updated ${this.changes} settledAt times from 2024 to 2025`)

          // Show some examples of updated dates
          db.all(`
            SELECT gw.gameweekNumber, 
                   datetime(gw.lockTime/1000, 'unixepoch') as lockTimeReadable,
                   datetime(f.kickoff/1000, 'unixepoch') as kickoffReadable
            FROM Gameweek gw 
            LEFT JOIN Fixture f ON gw.id = f.gameweekId 
            WHERE gw.gameweekNumber <= 5
            ORDER BY gw.gameweekNumber, f.kickoff
            LIMIT 10
          `, (err, rows) => {
            if (err) {
              console.error('Error getting updated dates:', err)
              reject(err)
              return
            }

            console.log('\n📅 Sample updated dates:')
            rows.forEach(row => {
              console.log(`   GW${row.gameweekNumber}: Lock ${row.lockTimeReadable}, Kickoff ${row.kickoffReadable}`)
            })

            console.log('\n✅ All dates successfully updated from 2024 to 2025!')
            console.log('   GW1-3: Past dates (settled)')
            console.log('   GW4: Current dates (active)')
            console.log('   GW5+: Future dates (scheduled)')
            
            db.close()
            resolve()
          })
        })
      })
    })
  })
}

fixDatesTo2025()
  .then(() => {
    console.log('✅ Script completed successfully!')
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
  })
