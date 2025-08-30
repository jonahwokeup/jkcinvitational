import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");

    if (!team) {
      return NextResponse.json(
        { error: "Team parameter is required" },
        { status: 400 }
      );
    }

    // Only get picks from SETTLED gameweeks to prevent revealing current picks
    const picks = await prisma.pick.findMany({
      where: {
        team: team,
        entry: {
          competitionId: id,
        },
        gameweek: {
          isSettled: true, // Only include picks from settled gameweeks
        },
      },
      include: {
        entry: {
          include: {
            user: true,
            round: true,
          },
        },
        gameweek: true,
        fixture: true,
      },
      orderBy: [
        { gameweek: { gameweekNumber: "asc" } },
        { createdAt: "asc" },
      ],
    });

    // Calculate result for each pick
    const picksWithResults = picks.map((pick) => {
      let result = "PENDING";
      if (pick.fixture.status === "FINISHED") {
        const isWin = 
          (pick.team === pick.fixture.homeTeam && pick.fixture.homeGoals! > pick.fixture.awayGoals!) ||
          (pick.team === pick.fixture.awayTeam && pick.fixture.awayGoals! > pick.fixture.homeGoals!);
        result = isWin ? "WIN" : "LOSS";
      }

      return {
        ...pick,
        result,
      };
    });

    return NextResponse.json({
      picks: picksWithResults,
    });
  } catch (error) {
    console.error("Error fetching team picks:", error);
    return NextResponse.json(
      { error: "Failed to fetch team picks" },
      { status: 500 }
    );
  }
}
