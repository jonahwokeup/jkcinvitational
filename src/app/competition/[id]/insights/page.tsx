import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import InsightsClient from "./insights-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InsightsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      entries: {
        include: {
          user: true,
          picks: {
            include: {
              gameweek: true,
              fixture: true,
            },
          },
          round: true,
        },
      },
      gameweeks: {
        include: {
          fixtures: {
            include: {
              picks: true,
            },
          },
        },
        orderBy: {
          gameweekNumber: "asc",
        },
      },
    },
  });

  if (!competition) {
    notFound();
  }

  // Only include picks from SETTLED gameweeks to prevent revealing current picks
  const settledGameweeks = competition.gameweeks.filter(gw => gw.isSettled);
  const settledGameweekIds = new Set(settledGameweeks.map(gw => gw.id));

  // Filter entries to only include picks from settled gameweeks
  const entriesWithSettledPicks = competition.entries.map(entry => ({
    ...entry,
    picks: entry.picks.filter(pick => settledGameweekIds.has(pick.gameweekId))
  }));

  // Calculate team usage and success rates (only from settled gameweeks)
  const teamStats = new Map<string, { usage: number; wins: number; totalPicks: number }>();

  entriesWithSettledPicks.forEach((entry) => {
    entry.picks.forEach((pick) => {
      const team = pick.team;
      const fixture = pick.fixture;
      const isWin = fixture.status === "FINISHED" &&
        ((pick.team === fixture.homeTeam && fixture.homeGoals! > fixture.awayGoals!) ||
         (pick.team === fixture.awayTeam && fixture.awayGoals! > fixture.homeGoals!));

      if (!teamStats.has(team)) {
        teamStats.set(team, { usage: 0, wins: 0, totalPicks: 0 });
      }

      const stats = teamStats.get(team)!;
      stats.usage++;
      stats.totalPicks++;
      if (isWin) stats.wins++;
    });
  });

  // Convert to array and sort by usage
  const teamStatsArray = Array.from(teamStats.entries())
    .map(([team, stats]) => ({
      team,
      usage: stats.usage,
      wins: stats.wins,
      totalPicks: stats.totalPicks,
      successRate: stats.totalPicks > 0 ? (stats.wins / stats.totalPicks) * 100 : 0,
    }))
    .sort((a, b) => b.usage - a.usage);

  // Calculate leaderboard positions over time (only from settled gameweeks)
  const leaderboardHistory = settledGameweeks.map((gameweek) => {
    const gameweekEntries = entriesWithSettledPicks.map((entry) => {
      const gameweekPicks = entry.picks.filter(pick => pick.gameweekId === gameweek.id);
      const gameweekWins = gameweekPicks.filter(pick => {
        const fixture = pick.fixture;
        if (fixture.status !== "FINISHED") return false;
        return (pick.team === fixture.homeTeam && fixture.homeGoals! > fixture.awayGoals!) ||
               (pick.team === fixture.awayTeam && fixture.awayGoals! > fixture.homeGoals!);
      }).length;

      return {
        userId: entry.userId,
        user: entry.user,
        gameweekNumber: gameweek.gameweekNumber,
        survived: gameweekWins > 0,
        gwsSurvived: entry.seasonGwsSurvived,
        roundWins: entry.seasonRoundWins,
      };
    });

    // Sort by GWs survived, then by round wins, then by creation time
    gameweekEntries.sort((a, b) => {
      if (b.gwsSurvived !== a.gwsSurvived) return b.gwsSurvived - a.gwsSurvived;
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      return new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime();
    });

    // Handle ties
    const positions = gameweekEntries.map((entry, index) => {
      let position = index + 1;
      if (index > 0) {
        const prevEntry = gameweekEntries[index - 1];
        if (prevEntry.gwsSurvived === entry.gwsSurvived &&
            prevEntry.roundWins === entry.roundWins) {
          position = gameweekEntries.findIndex(e =>
            e.gwsSurvived === entry.gwsSurvived && e.roundWins === entry.roundWins
          ) + 1;
        }
      }
      return { ...entry, position };
    });

    return {
      gameweekNumber: gameweek.gameweekNumber,
      positions,
    };
  });

  return (
    <InsightsClient
      competition={competition}
      teamStatsArray={teamStatsArray}
      leaderboardHistory={leaderboardHistory}
    />
  );
}
