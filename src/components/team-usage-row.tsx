"use client";

import React, { useState } from "react";
import TeamCrest from "@/components/team-crest";

interface TeamStat {
  team: string;
  usage: number;
  wins: number;
  totalPicks: number;
  successRate: number;
}

interface PickDetail {
  id: string;
  entry: {
    user: {
      name: string;
      email: string;
    };
    round: {
      roundNumber: number;
    };
  };
  gameweek: {
    gameweekNumber: number;
  };
  fixture: {
    homeTeam: string;
    awayTeam: string;
    homeGoals: number | null;
    awayGoals: number | null;
    status: string;
  };
  result: string;
}

interface TeamUsageRowProps {
  teamStat: TeamStat;
  competitionId: string;
}

// Helper function to format round display
function formatRoundDisplay(roundNumber: number, gameweekNumber: number) {
  const roundEmoji = "1️⃣";
  return `${roundEmoji} • GW${gameweekNumber}`;
}

// Helper function to format fixture display
function formatFixtureDisplay(fixture: PickDetail["fixture"]) {
  if (fixture.status === "FINISHED") {
    return `${fixture.homeTeam} ${fixture.homeGoals} - ${fixture.awayGoals} ${fixture.awayTeam}`;
  }
  return `${fixture.homeTeam} vs ${fixture.awayTeam}`;
}

export default function TeamUsageRow({ teamStat, competitionId }: TeamUsageRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pickDetails, setPickDetails] = useState<PickDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    console.log("Team row clicked:", teamStat.team, "Current expanded state:", isExpanded);

    if (!isExpanded && pickDetails.length === 0) {
      setIsLoading(true);
      try {
        console.log("Fetching pick details for team:", teamStat.team);
        const response = await fetch(`/api/competition/${competitionId}/team-picks?team=${encodeURIComponent(teamStat.team)}`);
        console.log("API response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("API response data:", data);
          
          // Add safety checks for the data structure
          if (data.picks && Array.isArray(data.picks)) {
            // Filter out any picks with missing required data
            const validPicks = data.picks.filter((pick: any) => 
              pick && 
              pick.entry && 
              pick.entry.user && 
              pick.entry.user.name &&
              pick.entry.round &&
              pick.gameweek &&
              pick.fixture
            );
            setPickDetails(validPicks);
            console.log("Valid picks found:", validPicks.length);
          } else {
            console.warn("No picks array in response or invalid structure");
            setPickDetails([]);
          }
        } else {
          console.error("API response not ok:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch pick details:", error);
      } finally {
        setIsLoading(false);
      }
    }

    const newExpandedState = !isExpanded;
    console.log("Setting expanded state to:", newExpandedState);
    setIsExpanded(newExpandedState);
  };

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={handleToggle}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-3">
            <TeamCrest teamName={teamStat.team} size="md" />
            <span className="text-sm font-medium text-gray-900">
              {teamStat.team}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {teamStat.usage}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {teamStat.wins}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {teamStat.successRate.toFixed(1)}%
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={4} className="px-6 py-4 bg-gray-50">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading pick details...</p>
              </div>
            ) : pickDetails.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 mb-3">Pick History</h4>
                {pickDetails.map((pick) => (
                  <div key={pick.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-purple-700">
                            {pick.entry.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pick.entry.user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatRoundDisplay(pick.entry.round.roundNumber, pick.gameweek.gameweekNumber)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatFixtureDisplay(pick.fixture)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          pick.result === "WIN" 
                            ? "bg-green-100 text-green-800" 
                            : pick.result === "LOSS" 
                            ? "bg-red-100 text-red-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {pick.result}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No pick details available</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
