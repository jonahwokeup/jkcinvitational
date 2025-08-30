"use client";

import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getUserPlaceholder } from "@/components/user-placeholder";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface PositionData {
  userId: string;
  user: User;
  gameweekNumber: number;
  survived: boolean;
  gwsSurvived: number;
  roundWins: number;
  position: number;
}

interface GameweekData {
  gameweekNumber: number;
  positions: PositionData[];
}

interface PositionTrackingChartProps {
  data: GameweekData[];
}

export default function PositionTrackingChart({ data }: PositionTrackingChartProps) {
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available yet. Check back after some gameweeks are settled.
      </div>
    );
  }

  // Get unique users and their colors
  const users = Array.from(
    new Set(data.flatMap(gw => gw.positions.map(p => p.userId)))
  ).map(userId => {
    const userData = data[0]?.positions.find(p => p.userId === userId)?.user;
    return {
      id: userId,
      name: userData?.name || "Unknown",
      image: userData?.image,
    };
  });

  // Debug: log user data to see what images we're getting
  console.log("Users with images:", users.map(u => ({ name: u.name, image: u.image })));

  // Create color palette
  const colors = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#F97316", // Orange
    "#06B6D4", // Cyan
    "#EC4899", // Pink
  ];

  // Prepare chart data
  const chartData = {
    labels: data.map(gw => `GW${gw.gameweekNumber}`),
    datasets: users.map((user, index) => {
      const userPositions = data.map(gameweek => {
        const position = gameweek.positions.find(p => p.userId === user.id);
        return position ? position.position : null;
      });

      // Add jittering for tied positions to separate lines visually
      const jitteredPositions = userPositions.map((pos, gwIndex) => {
        if (pos === null) return null;
        
        // Check if this position is tied with others in this gameweek
        const gameweek = data[gwIndex];
        const tiedUsers = gameweek.positions.filter(p => p.position === pos);
        
        if (tiedUsers.length > 1) {
          // Add small jitter for tied positions
          const userIndex = tiedUsers.findIndex(p => p.userId === user.id);
          const jitter = (userIndex - (tiedUsers.length - 1) / 2) * 0.1;
          return pos + jitter;
        }
        
        return pos;
      });

      return {
        label: user.name || "Unknown",
        data: jitteredPositions,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + "20",
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: colors[index % colors.length],
        pointBorderColor: "white",
        pointBorderWidth: 2,
        fill: false,
        tension: 0.1,
        pointStyle: "circle",
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // We'll create custom legend
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return `Gameweek ${data[context[0].dataIndex].gameweekNumber}`;
          },
          label: (context: any) => {
            const position = context.raw;
            if (position === null) return `${context.dataset.label}: No pick`;
            
            // Round to nearest whole number for display
            const displayPosition = Math.round(position);
            const suffix = displayPosition === 1 ? "st" : displayPosition === 2 ? "nd" : displayPosition === 3 ? "rd" : "th";
            return `${context.dataset.label}: ${displayPosition}${suffix}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Gameweek",
        },
        grid: {
          display: true,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Position",
        },
        reverse: true, // 1st at top, 4th at bottom
        min: 1,
        max: users.length,
        ticks: {
          stepSize: 1,
          callback: function(tickValue: string | number) {
            const value = Number(tickValue);
            const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
            return `${value}${suffix}`;
          },
        },
        grid: {
          display: true,
        },
      },
    },
    elements: {
      point: {
        hoverRadius: 8,
      },
    },
  };

  return (
    <div className="w-full h-full relative">
      {/* Custom Legend */}
      <div className="flex flex-wrap gap-4 mb-4 justify-center">
        {users.map((user, index) => (
          <div
            key={user.id}
            className="flex items-center space-x-2 cursor-pointer"
            onMouseEnter={() => setHoveredUser(user.id)}
            onMouseLeave={() => setHoveredUser(null)}
            style={{
              opacity: hoveredUser && hoveredUser !== user.id ? 0.3 : 1,
            }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full overflow-hidden">
                {getUserPlaceholder(user.name || null, user.image || null)}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user.name || "Unknown"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-80">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Custom User Images Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {data.map((gameweek, gwIndex) => 
          gameweek.positions.map((entry, posIndex) => {
            const user = users.find(u => u.id === entry.userId);
            if (!user) return null;
            
            const x = (gwIndex / (data.length - 1)) * 100; // X position as percentage
            const y = ((entry.position - 1) / (users.length - 1)) * 100; // Y position as percentage
            
            return (
              <div
                key={`${entry.userId}-${gameweek.gameweekNumber}`}
                className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                {getUserPlaceholder(user.name || null, user.image || null)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
