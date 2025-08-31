"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic imports for chart components
const PositionTrackingChart = dynamic(() => import("@/components/position-tracking-chart"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-80 rounded-lg" />
});

const TeamUsageRow = dynamic(() => import("@/components/team-usage-row"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-6 rounded" />
});

interface InsightsClientProps {
  competition: any;
  teamStatsArray: any[];
  leaderboardHistory: any[];
}

export default function InsightsClient({ competition, teamStatsArray, leaderboardHistory }: InsightsClientProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Insights</h1>
              <p className="text-gray-600">{competition.name} - {competition.season}</p>
            </div>
            <Link
              href={`/competition/${competition.id}`}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Team Usage & Success Rates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Team Usage & Success Rates</h2>
              <p className="text-sm text-gray-600 mt-1">Click on a team to see detailed pick history</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Times Picked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Leaderboard Position Tracking</h2>
              <p className="text-sm text-gray-600 mt-1">Visual tracking of how each player&apos;s position changed throughout the season</p>
            </div>
            <div className="p-6">
              <PositionTrackingChart data={leaderboardHistory} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
