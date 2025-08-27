const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Adding GW2 picks...');

  const competition = await prisma.competition.findFirst({ where: { name: 'JKC Invitational' } });
  if (!competition) throw new Error('Competition not found');

  const gw2 = await prisma.gameweek.findFirst({
    where: { competitionId: competition.id, gameweekNumber: 2 },
    include: { fixtures: true }
  });
  if (!gw2) throw new Error('Gameweek 2 not found');

  const users = await prisma.user.findMany();
  const byName = Object.fromEntries(users.map(u => [u.name, u]));

  const picks = [
    { name: 'Jonah McGowan', team: 'Bournemouth' },
    { name: 'Max Reid', team: 'Arsenal' },
    { name: 'Chris Grube', team: 'Arsenal' },
    { name: 'Abboud Hammour', team: 'Arsenal' },
  ];

  for (const p of picks) {
    const user = byName[p.name];
    if (!user) { console.log(`❌ User not found: ${p.name}`); continue; }
    const entry = await prisma.entry.findFirst({ where: { userId: user.id, competitionId: competition.id } });
    if (!entry) { console.log(`❌ Entry not found for ${p.name}`); continue; }

    const fixture = gw2.fixtures.find(f => f.homeTeam === p.team || f.awayTeam === p.team);
    if (!fixture) { console.log(`❌ Fixture not found for ${p.team} in GW2`); continue; }

    const existing = await prisma.pick.findFirst({ where: { entryId: entry.id, gameweekId: gw2.id } });
    if (existing) {
      await prisma.pick.update({ where: { id: existing.id }, data: { fixtureId: fixture.id, team: p.team } });
      console.log(`⚠️ Updated pick for ${p.name}: ${p.team}`);
    } else {
      await prisma.pick.create({ data: { entryId: entry.id, gameweekId: gw2.id, fixtureId: fixture.id, team: p.team } });
      console.log(`✅ Added pick for ${p.name}: ${p.team}`);
    }
  }

  console.log('🎉 GW2 picks saved');
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });


