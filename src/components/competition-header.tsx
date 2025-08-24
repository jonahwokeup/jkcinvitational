"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

interface CompetitionHeaderProps {
  competitionName: string
  season: string
  inviteCode: string
}

export default function CompetitionHeader({ competitionName, season, inviteCode }: CompetitionHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {competitionName}
          </h1>
          <p className="text-gray-600">{season}</p>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="text-sm text-gray-500">Invite Code</p>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {inviteCode}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}

