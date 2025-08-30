"use client";

import React, { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
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
import { getUserPlaceholder } from "./user-placeholder";

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

interface GameweekData {
  gameweekNumber: number;
  positions: Array<{
    userId: string;
    user: {
      id: string;
      name: string;
      image: string | null;
    };
    position: number;
    survived: boolean;
  }>;
}

interface PositionTrackingChartProps {
  data: GameweekData[];
}

export default function PositionTrackingChart({ data }: PositionTrackingChartProps) {
  const chartRef = useRef<ChartJS<"line">>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; image: string | null }>>([]);

  // Extract unique users from the data
  useEffect(() => {
    const uniqueUsers = new Map<string, { id: string; name: string; image: string | null }>();
    
    data.forEach(gameweek => {
      gameweek.positions.forEach(position => {
        if (position.user && !uniqueUsers.has(position.user.id)) {
          uniqueUsers.set(position.user.id, {
            id: position.user.id,
            name: position.user.name,
            image: position.user.image
          });
        }
      });
    });
    
    setUsers(Array.from(uniqueUsers.values()));
  }, [data]);

  // Define colors for the lines
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
        pointStyle: "circle", // Point style is circle, images are overlaid
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
        display: false, // We'll create a custom legend
      },
      tooltip: {
        callbacks: {
          title: (context: any) => `Gameweek ${context[0].label}`,
          label: (context: any) => {
            const position = Math.round(context.parsed.y);
            const suffix = position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th";
            return `${context.dataset.label}: ${position}${suffix}`;
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
        grid: { display: true },
      },
    },
    elements: { point: { hoverRadius: 8 } },
  };

  return (
    <div className="w-full h-full relative">
      {/* Custom Legend */}
      <div className="flex flex-wrap gap-4 mb-4 justify-center">
        {users.map((user, index) => (
          <div key={user.id} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm font-medium text-gray-700">
              {user.name || "Unknown"}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-80">
        <Line data={chartData} options={options} ref={chartRef} />
      </div>

      {/* Custom User Images Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {data.map((gameweek, gwIndex) =>
          gameweek.positions.map((entry, posIndex) => {
            const user = users.find(u => u.id === entry.userId);
            if (!user) return null;

            // Calculate x and y positions based on chart scale
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
