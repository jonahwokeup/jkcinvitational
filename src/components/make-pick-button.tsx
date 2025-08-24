"use client"

import { Target } from 'lucide-react'

interface MakePickButtonProps {
  competitionId: string
}

export default function MakePickButton({ competitionId }: MakePickButtonProps) {
  return (
    <a
      href={`/competition/${competitionId}/pick`}
      className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
    >
      <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Make Pick</h3>
      <p className="text-gray-600">Choose your team for this gameweek</p>
    </a>
  );
}