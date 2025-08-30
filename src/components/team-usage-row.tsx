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

interface TeamUsageRowProps {
  teamStat: TeamStat;
  competitionId: string;
}

export default function TeamUsageRow({ teamStat, competitionId }: TeamUsageRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pickDetails, setPickDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    console.log("Team row clicked:", teamStat.team, "Current expanded state:", isExpanded);
    
    if (!isExpanded && pickDetails.length === 0) {
      setIsLoading(true);
      try {
        console.log("Fetching pick details for team:", teamStat.team);
        // Fetch detailed pick information for this team
        const response = await fetch(`/api/competition/${competitionId}/team-picks?team=${encodeURIComponent(teamStat.team)}`);
        console.log("API response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("API response data:", data);
          setPickDetails(data.picks || []);
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

  const getRoundEmoji = (roundNumber: number) => {
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    return emojis[roundNumber - 1] || "🔢";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });
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
          <span className={`font-medium ${teamStat.successRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
            {teamStat.successRate.toFixed(1)}%
          </span>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={4} className="px-6 py-4 bg-gray-50">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                Detailed Pick History for {teamStat.team}
              </h4>
              
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading pick details...</p>
                </div>
              ) : pickDetails.length > 0 ? (
                <div className="space-y-2">
                  {pickDetails.map((pick, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                          {pick.user.name?.charAt(0) || "?"}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {pick.user.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>Round {getRoundEmoji(pick.round?.roundNumber || 1)} • GW{pick.gameweek.gameweekNumber} • {formatDate(pick.fixture.kickoff)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pick.result === 'WIN' 
                            ? 'bg-green-100 text-green-800' 
                            : pick.result === 'LOSS' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {pick.result === 'WIN' ? '✅ Won' : pick.result === 'LOSS' ? '❌ Lost' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No detailed pick information available
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
