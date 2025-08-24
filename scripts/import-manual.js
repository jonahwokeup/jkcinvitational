const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const ical = require('node-ical');

const prisma = new PrismaClient();

// Premier League team name mapping (from iCal to our database)
const TEAM_NAME_MAPPING = {
  'Arsenal': 'Arsenal',
  'Aston Villa': 'Aston Villa',
  'Bournemouth': 'Bournemouth',
  'Brentford': 'Brentford',
  'Brighton': 'Brighton & Hove Albion',
  'Burnley': 'Burnley',
  'Chelsea': 'Chelsea',
  'Crystal Palace': 'Crystal Palace',
  'Everton': 'Everton',
  'Fulham': 'Fulham',
  'Liverpool': 'Liverpool',
  'Luton': 'Luton Town',
  'Man City': 'Manchester City',
  'Manchester City': 'Manchester City',
  'Man Utd': 'Manchester United',
  'Manchester United': 'Manchester United',
  'Newcastle': 'Newcastle United',
  'Nottingham Forest': 'Nottingham Forest',
  'Sheffield Utd': 'Sheffield United',
  'Tottenham': 'Tottenham Hotspur',
  'West Ham': 'West Ham United',
  'Wolves': 'Wolverhampton Wanderers',
  // Additional teams that might appear in the iCal file
  'Sunderland': 'Sunderland', // Championship team that might be in the file
  'Leicester': 'Leicester City', // Promoted team
  'Ipswich': 'Ipswich Town', // Promoted team
  'Southampton': 'Southampton' // Promoted team
};

function parseFixturesFromICalFile(filePath) {
  console.log(`📁 Reading iCal file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const events = ical.parseFile(filePath);
  const fixtures = [];
  
  for (const [uid, event] of Object.entries(events)) {
    if (event.type === 'VEVENT' && event.summary) {
      const summary = event.summary;
      
      // Look for team names in the summary
      let homeTeam = null;
      let awayTeam = null;
      
      for (const [icalName, dbName] of Object.entries(TEAM_NAME_MAPPING)) {
        if (summary.includes(icalName)) {
          if (!homeTeam) {
            homeTeam = dbName;
          } else if (!awayTeam) {
            awayTeam = dbName;
            break;
          }
        }
      }
      
      if (homeTeam && awayTeam && homeTeam !== awayTeam) {
        fixtures.push({
          summary: event.summary,
          homeTeam,
          awayTeam,
          start: event.start,
          end: event.end,
          uid
        });
      }
    }
  }
  
  // Debug: Show first few fixture dates
  if (fixtures.length > 0) {
    console.log('📅 Sample fixture dates:');
    fixtures.slice(0, 3).forEach((fixture, i) => {
      console.log(`  ${i + 1}. ${fixture.summary} - ${fixture.start}`);
    });
  }
  
  console.log(`⚽ Found ${fixtures.length} Premier League fixtures`);
  return fixtures;
}

function organizeFixturesIntoMatchweeks(fixtures) {
  // Sort fixtures by date
  fixtures.sort((a, b) => a.start - b.start);
  
  const matchweeks = {};
  const seasonStart = new Date('2025-08-16'); // Premier League 2025/26 season start
  
  fixtures.forEach(fixture => {
    const fixtureDate = new Date(fixture.start);
    
    // Calculate matchweek number (roughly every 7 days)
    const daysSinceStart = Math.floor((fixtureDate - seasonStart) / (1000 * 60 * 60 * 24));
    const matchweekNumber = Math.floor(daysSinceStart / 7) + 1;
    
    if (matchweekNumber >= 1 && matchweekNumber <= 38) {
      if (!matchweeks[matchweekNumber]) {
        matchweeks[matchweekNumber] = {
          gameweekNumber: matchweekNumber,
          lockTime: new Date(fixtureDate),
          fixtures: []
        };
      }
      
      matchweeks[matchweekNumber].fixtures.push(fixture);
    }
  });
  
  console.log(`📅 Organized into ${Object.keys(matchweeks).length} matchweeks`);
  return Object.values(matchweeks);
}

async function importFixturesToDatabase(matchweeks) {
  console.log('🗄️ Importing fixtures to database...');
  
  // Get or create competition
  let competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });
  
  if (!competition) {
          competition = await prisma.competition.create({
        data: {
          name: "JKC Invitational",
          season: "2025/26 Premier League",
          timezone: "Europe/London",
          startDate: new Date("2025-08-16"),
          endDate: new Date("2026-05-25"),
          lockPolicy: "FIRST_GW_KICKOFF",
          resultPolicy: "DRAW_ELIM_LOSS_ELIM",
          livesPerRound: 1,
          inviteCode: "JKC2025",
          isActive: true,
        },
      });
  }
  
  // Clear existing gameweeks and fixtures
  console.log('🧹 Clearing existing fixtures...');
  await prisma.fixture.deleteMany({});
  await prisma.gameweek.deleteMany({});
  
  // Create matchweeks and fixtures
  for (const matchweekData of matchweeks) {
    const matchweek = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: matchweekData.gameweekNumber,
        lockTime: matchweekData.lockTime,
      },
    });
    
    console.log(`  📊 Gameweek ${matchweek.gameweekNumber}: ${matchweekData.fixtures.length} fixtures`);
    
    // Create fixtures for this matchweek
    for (const fixtureData of matchweekData.fixtures) {
      await prisma.fixture.create({
        data: {
          gameweekId: matchweek.id,
          homeTeam: fixtureData.homeTeam,
          awayTeam: fixtureData.awayTeam,
          kickoff: fixtureData.start,
          status: "SCHEDULED",
        },
      });
    }
  }
  
  console.log('✅ All fixtures imported successfully!');
  return competition;
}

async function main() {
  try {
    console.log('🏆 Premier League Fixture Importer (Manual)');
    console.log('============================================');
    
    // Check if iCal file path is provided
    const filePath = process.argv[2] || './premier-league.ics';
    
    if (!process.argv[2]) {
      console.log('📝 Usage: npm run import:manual <path-to-ical-file>');
      console.log('📝 Example: npm run import:manual ./downloads/premier-league.ics');
      console.log('');
      console.log('📥 To download the iCal file:');
      console.log('   1. Visit: https://ics.ecal.com/ecal-sub/68a5fe56385d670008a84fc0/English%20Premier%20League.ics');
      console.log('   2. Save the file as premier-league.ics');
      console.log('   3. Run: npm run import:manual ./premier-league.ics');
      console.log('');
    }
    
    // Parse iCal file
    const fixtures = parseFixturesFromICalFile(filePath);
    const matchweeks = organizeFixturesIntoMatchweeks(fixtures);
    
    // Import to database
    const competition = await importFixturesToDatabase(matchweeks);
    
    console.log('\n🎉 Import completed successfully!');
    console.log(`🏆 Competition: ${competition.name}`);
    console.log(`📅 Season: ${competition.season}`);
    console.log(`🎯 Matchweeks: ${matchweeks.length}`);
    console.log(`⚽ Total Fixtures: ${fixtures.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
