"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Dynamically import Chart.js components to avoid SSR issues
const PositionTrackingChart = dynamic(() => import("@/components/position-tracking-chart"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
});

const TeamUsageRow = dynamic(() => import("@/components/team-usage-row"), {
  ssr: false,
  loading: () => <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
});

interface Competition {
  id: string;
  name: string;
  season: string;
}

interface TeamStat {
  team: string;
  usage: number;
  wins: number;
  totalPicks: number;
  successRate: number;
}

interface GameweekData {
  gameweekNumber: number;
  positions: any[];
}

interface InsightsClientProps {
  competition: Competition;
  teamStatsArray: TeamStat[];
  leaderboardHistory: GameweekData[];
}

export default function InsightsClient({
  competition,
  teamStatsArray,
  leaderboardHistory
}: InsightsClientProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href={`/competition/${competition.id}`}
          className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Competition</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {competition.name} - Insights
        </h1>
        <p className="text-gray-600">
          Detailed statistics and analysis for the {competition.season} season
        </p>
      </div>

      {/* Team Usage & Success Rates */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Team Usage & Success Rates
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Times Picked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wins
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamStatsArray.map((teamStat) => (
                <TeamUsageRow
                  key={teamStat.team}
                  teamStat={teamStat}
                  competitionId={competition.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leaderboard Position Tracking */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Leaderboard Position Tracking
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Visual tracking of how each player&apos;s position changed throughout the season
          </p>
        </div>
        <div className="h-96">
          <PositionTrackingChart data={leaderboardHistory} />
        </div>
      </div>
    </div>
  );
}
