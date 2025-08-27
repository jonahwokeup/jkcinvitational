const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const cheerio = require('cheerio')

const prisma = new PrismaClient()

// Function to scrape Premier League results using multiple approaches
async function scrapePremierLeagueResults() {
  try {
    console.log('🌐 Scraping Premier League results...')
    
    // Get the competition to find unsettled gameweeks
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    
    if (!competition) {
      console.error('❌ Competition not found')
      return []
    }
    
    // Get unsettled gameweeks to scrape
    const unsettledGameweeks = await prisma.gameweek.findMany({
      where: {
        competitionId: competition.id,
        isSettled: false
      },
      orderBy: { gameweekNumber: 'asc' }
    })
    
    if (unsettledGameweeks.length === 0) {
      console.log('✅ All gameweeks are already settled!')
      return []
    }
    
    const allResults = []
    
    // Try different scraping approaches for each gameweek
    for (const gameweek of unsettledGameweeks) {
      console.log(`\n📅 Scraping Gameweek ${gameweek.gameweekNumber}...`)
      
      // Try multiple approaches
      let results = []
      
      // Approach 1: Direct Premier League matches page
      results = await scrapeFromMatchesPage(gameweek.gameweekNumber)
      if (results.length > 0) {
        console.log(`✅ Approach 1: Found ${results.length} results`)
      } else {
        // Approach 2: Try the fixtures page
        results = await scrapeFromFixturesPage(gameweek.gameweekNumber)
        if (results.length > 0) {
          console.log(`✅ Approach 2: Found ${results.length} results`)
        } else {
          // Approach 3: Try the results page
          results = await scrapeFromResultsPage(gameweek.gameweekNumber)
          if (results.length > 0) {
            console.log(`✅ Approach 3: Found ${results.length} results`)
          }
        }
      }
      
      if (results.length > 0) {
        // Add gameweek info to each result
        results.forEach(result => {
          result.gameweek = gameweek.gameweekNumber
        })
        allResults.push(...results)
        console.log(`🎯 GW${gameweek.gameweekNumber}: Total ${results.length} results`)
      } else {
        console.log(`⚠️  GW${gameweek.gameweekNumber}: No results found`)
      }
    }
    
    console.log(`\n🎯 Total results scraped: ${allResults.length}`)
    return allResults
    
  } catch (error) {
    console.error('❌ Error scraping results:', error.message)
    return []
  }
}

// Approach 1: Scrape from the matches page
async function scrapeFromMatchesPage(gameweekNumber) {
  try {
    const url = `https://www.premierleague.com/en/matches?competition=8&season=2025&matchweek=${gameweekNumber}&month=08`
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.premierleague.com/',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    })
    
    const $ = cheerio.load(response.data)
    const results = []
    
    // Look for various possible selectors
    const selectors = [
      '.match-row',
      '.match',
      '[data-match-id]',
      '.fixture',
      '.game',
      '.result'
    ]
    
    for (const selector of selectors) {
      $(selector).each((index, element) => {
        const $element = $(element)
        const match = extractMatchData($element)
        if (match) {
          results.push(match)
        }
      })
      
      if (results.length > 0) break
    }
    
    // If still no results, try to find any text containing match patterns
    if (results.length === 0) {
      const bodyText = $('body').text()
      const matchPatterns = findMatchPatterns(bodyText)
      results.push(...matchPatterns)
    }
    
    return results
    
  } catch (error) {
    console.error(`❌ Error scraping matches page for GW${gameweekNumber}:`, error.message)
    return []
  }
}

// Approach 2: Scrape from the fixtures page
async function scrapeFromFixturesPage(gameweekNumber) {
  try {
    const url = `https://www.premierleague.com/en/fixtures?competition=8&season=2025&matchweek=${gameweekNumber}&month=08`
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.premierleague.com/',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    })
    
    const $ = cheerio.load(response.data)
    const results = []
    
    // Look for fixture elements
    $('.fixture, .match, .game').each((index, element) => {
      const $element = $(element)
      const match = extractMatchData($element)
      if (match) {
        results.push(match)
      }
    })
    
    return results
    
  } catch (error) {
    console.error(`❌ Error scraping fixtures page for GW${gameweekNumber}:`, error.message)
    return []
  }
}

// Approach 3: Scrape from the results page
async function scrapeFromResultsPage(gameweekNumber) {
  try {
    const url = `https://www.premierleague.com/en/results?competition=8&season=2025&matchweek=${gameweekNumber}&month=08`
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.premierleague.com/',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    })
    
    const $ = cheerio.load(response.data)
    const results = []
    
    // Look for result elements
    $('.result, .match, .game').each((index, element) => {
      const $element = $(element)
      const match = extractMatchData($element)
      if (match) {
        results.push(match)
      }
    })
    
    return results
    
  } catch (error) {
    console.error(`❌ Error scraping results page for GW${gameweekNumber}:`, error.message)
    return []
  }
}

// Extract match data from an element
function extractMatchData($element) {
  // Try multiple selectors for team names and scores
  const selectors = {
    homeTeam: [
      '.home-team',
      '.team-home',
      '.home .team-name',
      '.home-team-name',
      '[class*="home"] [class*="team"]',
      '.home'
    ],
    awayTeam: [
      '.away-team',
      '.team-away',
      '.away .team-name',
      '.away-team-name',
      '[class*="away"] [class*="team"]',
      '.away'
    ],
    score: [
      '.score',
      '.match-score',
      '.result',
      '.goals',
      '[class*="score"]',
      '[class*="result"]'
    ]
  }
  
  let homeTeam = ''
  let awayTeam = ''
  let score = ''
  
  // Try to find home team
  for (const selector of selectors.homeTeam) {
    homeTeam = $element.find(selector).text().trim()
    if (homeTeam) break
  }
  
  // Try to find away team
  for (const selector of selectors.awayTeam) {
    awayTeam = $element.find(selector).text().trim()
    if (awayTeam) break
  }
  
  // Try to find score
  for (const selector of selectors.score) {
    score = $element.find(selector).text().trim()
    if (score) break
  }
  
  // Clean up the extracted text
  homeTeam = cleanTeamName(homeTeam)
  awayTeam = cleanTeamName(awayTeam)
  score = cleanScore(score)
  
  if (homeTeam && awayTeam && score) {
    const match = parseScore(homeTeam, awayTeam, score)
    if (match) {
      return match
    }
  }
  
  return null
}

// Find match patterns in text
function findMatchPatterns(text) {
  const results = []
  
  // Pattern 1: "Team A 2-1 Team B"
  const pattern1 = text.match(/([A-Za-z\s&]+)\s+(\d+)-(\d+)\s+([A-Za-z\s&]+)/g)
  if (pattern1) {
    pattern1.forEach(match => {
      const parts = match.match(/([A-Za-z\s&]+)\s+(\d+)-(\d+)\s+([A-Za-z\s&]+)/)
      if (parts) {
        const homeTeam = cleanTeamName(parts[1])
        const awayTeam = cleanTeamName(parts[4])
        const homeGoals = parseInt(parts[2])
        const awayGoals = parseInt(parts[3])
        
        if (homeTeam && awayTeam && !isNaN(homeGoals) && !isNaN(awayGoals)) {
          results.push({
            homeTeam,
            awayTeam,
            homeGoals,
            awayGoals,
            status: 'FINISHED'
          })
        }
      }
    })
  }
  
  // Pattern 2: "Team A v Team B 2-1"
  const pattern2 = text.match(/([A-Za-z\s&]+)\s+v\s+([A-Za-z\s&]+)\s+(\d+)-(\d+)/g)
  if (pattern2) {
    pattern2.forEach(match => {
      const parts = match.match(/([A-Za-z\s&]+)\s+v\s+([A-Za-z\s&]+)\s+(\d+)-(\d+)/)
      if (parts) {
        const homeTeam = cleanTeamName(parts[1])
        const awayTeam = cleanTeamName(parts[2])
        const homeGoals = parseInt(parts[3])
        const awayGoals = parseInt(parts[4])
        
        if (homeTeam && awayTeam && !isNaN(homeGoals) && !isNaN(awayGoals)) {
          results.push({
            homeTeam,
            awayTeam,
            homeGoals,
            awayGoals,
            status: 'FINISHED'
          })
        }
      }
    })
  }
  
  return results
}

// Clean team name text
function cleanTeamName(teamName) {
  if (!teamName) return ''
  
  // Remove extra whitespace and common prefixes/suffixes
  return teamName
    .replace(/\s+/g, ' ')
    .replace(/^FC\s+/, '')
    .replace(/\s+FC$/, '')
    .replace(/^The\s+/, '')
    .replace(/^AFC\s+/, '')
    .replace(/\s+AFC$/, '')
    .trim()
}

// Clean score text
function cleanScore(score) {
  if (!score) return ''
  
  // Remove extra whitespace and extract just the score
  return score
    .replace(/\s+/g, '')
    .replace(/[^\d\-:]/g, '')
    .trim()
}

// Parse score from various formats
function parseScore(homeTeam, awayTeam, score) {
  try {
    // Handle various score formats: "2-1", "2:1", "2 - 1", etc.
    const scoreMatch = score.match(/(\d+)[\s:.-]*(\d+)/)
    if (!scoreMatch) return null
    
    const homeGoals = parseInt(scoreMatch[1])
    const awayGoals = parseInt(scoreMatch[2])
    
    if (isNaN(homeGoals) || isNaN(awayGoals)) return null
    
    return {
      homeTeam: normalizeTeamName(homeTeam),
      awayTeam: normalizeTeamName(awayTeam),
      homeGoals,
      awayGoals,
      status: 'FINISHED'
    }
  } catch (error) {
    console.error('❌ Error parsing score:', error)
    return null
  }
}

// Normalize team names to match our database
function normalizeTeamName(teamName) {
  const teamMapping = {
    'Arsenal': 'Arsenal',
    'Aston Villa': 'Aston Villa',
    'Bournemouth': 'Bournemouth',
    'Brentford': 'Brentford',
    'Brighton': 'Brighton & Hove Albion',
    'Brighton & Hove Albion': 'Brighton & Hove Albion',
    'Burnley': 'Burnley',
    'Chelsea': 'Chelsea',
    'Crystal Palace': 'Crystal Palace',
    'Everton': 'Everton',
    'Fulham': 'Fulham',
    'Leeds': 'Leeds United',
    'Leeds United': 'Leeds United',
    'Liverpool': 'Liverpool',
    'Man City': 'Manchester City',
    'Manchester City': 'Manchester City',
    'Man Utd': 'Manchester United',
    'Manchester United': 'Manchester United',
    'Newcastle': 'Newcastle United',
    'Newcastle United': 'Newcastle United',
    'Nottingham Forest': 'Nottingham Forest',
    'Sunderland': 'Sunderland',
    'Spurs': 'Tottenham Hotspur',
    'Tottenham': 'Tottenham Hotspur',
    'Tottenham Hotspur': 'Tottenham Hotspur',
    'West Ham': 'West Ham United',
    'West Ham United': 'West Ham United',
    'Wolves': 'Wolverhampton Wanderers',
    'Wolverhampton Wanderers': 'Wolverhampton Wanderers'
  }
  
  return teamMapping[teamName] || teamName
}

// Main function to update fixtures with scraped results
async function updateFixturesWithResults() {
  try {
    console.log('🏆 Updating fixtures with scraped results...')
    
    // Get the competition
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    
    if (!competition) {
      console.error('❌ Competition not found')
      return
    }
    
    // Scrape results
    const scrapedResults = await scrapePremierLeagueResults()
    
    if (scrapedResults.length === 0) {
      console.log('⚠️  No results scraped')
      console.log('💡 You can run: node scripts/enter-gw1-results.js for manual entry')
      return
    }
    
    // Get all unsettled gameweeks
    const unsettledGameweeks = await prisma.gameweek.findMany({
      where: {
        competitionId: competition.id,
        isSettled: false
      },
      include: {
        fixtures: true
      },
      orderBy: { gameweekNumber: 'asc' }
    })
    
    console.log(`📅 Found ${unsettledGameweeks.length} unsettled gameweeks`)
    
    // Process each unsettled gameweek
    for (const gameweek of unsettledGameweeks) {
      console.log(`\n🎯 Processing Gameweek ${gameweek.gameweekNumber}...`)
      
      let allFixturesHaveResults = true
      let updatedFixtures = 0
      
      // Get results for this specific gameweek
      const gameweekResults = scrapedResults.filter(r => r.gameweek === gameweek.gameweekNumber)
      
      // Update fixtures with scraped results
      for (const fixture of gameweek.fixtures) {
        const result = gameweekResults.find(r => 
          (r.homeTeam === fixture.homeTeam && r.awayTeam === fixture.awayTeam) ||
          (r.homeTeam === fixture.awayTeam && r.awayTeam === fixture.homeTeam)
        )
        
        if (result) {
          // Update fixture with results
          await prisma.fixture.update({
            where: { id: fixture.id },
            data: {
              homeGoals: result.homeGoals,
              awayGoals: result.awayGoals,
              status: 'FINISHED'
            }
          })
          
          updatedFixtures++
          console.log(`  ✅ ${fixture.homeTeam} ${result.homeGoals}-${result.awayGoals} ${fixture.awayTeam}`)
        } else {
          allFixturesHaveResults = false
          console.log(`  ⏳ ${fixture.homeTeam} vs ${fixture.awayTeam} - No result yet`)
        }
      }
      
      // If all fixtures have results, mark gameweek as settled
      if (allFixturesHaveResults && gameweek.fixtures.length > 0) {
        await prisma.gameweek.update({
          where: { id: gameweek.id },
          data: { 
            isSettled: true,
            settledAt: new Date()
          }
        })
        
        console.log(`🎉 Gameweek ${gameweek.gameweekNumber} marked as settled!`)
        
        // Process picks and eliminate players
        await processGameweekResults(gameweek.id)
      }
    }
    
    console.log('\n✅ Fixture update complete!')
    
  } catch (error) {
    console.error('❌ Error updating fixtures:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Process gameweek results and eliminate players
async function processGameweekResults(gameweekId) {
  try {
    console.log(`🏆 Processing results for gameweek ${gameweekId}...`)
    
    // Get all picks for this gameweek
    const picks = await prisma.pick.findMany({
      where: { gameweekId },
      include: {
        entry: {
          include: {
            user: true
          }
        },
        fixture: true
      }
    })
    
    console.log(`📊 Processing ${picks.length} picks...`)
    
    for (const pick of picks) {
      const fixture = pick.fixture
      
      if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
        // Determine if the picked team won, drew, or lost
        let result
        if (pick.team === fixture.homeTeam) {
          if (fixture.homeGoals > fixture.awayGoals) result = 'WIN'
          else if (fixture.homeGoals === fixture.awayGoals) result = 'DRAW'
          else result = 'LOSS'
        } else {
          if (fixture.awayGoals > fixture.homeGoals) result = 'WIN'
          else if (fixture.awayGoals === fixture.homeGoals) result = 'DRAW'
          else result = 'LOSS'
        }
        
        console.log(`  ${pick.entry.user.name}: ${pick.team} - ${result}`)
        
        // If player lost, eliminate them
        if (result === 'LOSS') {
          await prisma.entry.update({
            where: { id: pick.entry.id },
            data: {
              livesRemaining: 0,
              eliminatedAtGw: fixture.gameweek.gameweekNumber
            }
          })
          
          console.log(`    💀 ${pick.entry.user.name} eliminated!`)
        }
      }
    }
    
    console.log(`✅ Gameweek ${gameweekId} results processed`)
    
  } catch (error) {
    console.error('❌ Error processing gameweek results:', error)
  }
}

// Run the scraper
updateFixturesWithResults()


