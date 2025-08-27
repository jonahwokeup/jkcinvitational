"use client"

import { useState } from "react"
import { createPick } from "@/lib/actions"
import { formatDate } from "@/lib/utils"

interface PickFormProps {
  fixtures: Array<{
    id: string
    homeTeam: string
    awayTeam: string
    kickoff: Date
  }>
  usedTeams: string[]
  isLocked: boolean
  gameweekId: string
  currentPick?: {
    team: string
    fixtureId: string
    id: string
  }
}

export default function PickForm({ fixtures, usedTeams, isLocked, gameweekId, currentPick }: PickFormProps) {
  const [selectedFixture, setSelectedFixture] = useState<string>("")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFixture || !selectedTeam) return

    setIsSubmitting(true)
    
    const formData = new FormData()
    formData.append("fixtureId", selectedFixture)
    formData.append("team", selectedTeam)
    if (currentPick) {
      formData.append("pickId", currentPick.id)
    }
    
    const result = await createPick(formData)
    
    if (result?.success) {
      window.location.reload()
    } else {
      alert(result?.error || "Failed to submit pick")
    }
    
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="gameweekId" value={gameweekId} />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fixtures.map((fixture) => {
          const homeTeamUsed = usedTeams.includes(fixture.homeTeam)
          const awayTeamUsed = usedTeams.includes(fixture.awayTeam)
          // If this fixture has the current pick, both teams should be available for changing
          const isCurrentPickFixture = currentPick && currentPick.fixtureId === fixture.id
          const hasAvailableTeam = isCurrentPickFixture || !homeTeamUsed || !awayTeamUsed
          const isDisabled = !hasAvailableTeam || isLocked
          const isSelected = selectedFixture === fixture.id
          
          return (
            <div
              key={fixture.id}
              className={`relative cursor-pointer ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
              }`}
            >
              <div 
                className={`p-4 border-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'border-green-500 bg-green-50'
                    : !hasAvailableTeam
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => !isDisabled && setSelectedFixture(fixture.id)}
              >
                <div className="text-center">
                  <div className="font-medium text-gray-900 mb-1">{fixture.homeTeam}</div>
                  <div className="text-sm text-gray-500 mb-2">vs</div>
                  <div className="font-medium text-gray-900 mb-2">{fixture.awayTeam}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(fixture.kickoff, "PPp")}
                  </div>
                  {isSelected && hasAvailableTeam && !isLocked && (
                    <div className="mt-3 space-y-2">
                      {!homeTeamUsed && (
                        <label className="flex items-center justify-center">
                          <input
                            type="radio"
                            name="team"
                            value={fixture.homeTeam}
                            checked={selectedTeam === fixture.homeTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">{fixture.homeTeam}</span>
                        </label>
                      )}
                      {!awayTeamUsed && (
                        <label className="flex items-center justify-center">
                          <input
                            type="radio"
                            name="team"
                            value={fixture.awayTeam}
                            checked={selectedTeam === fixture.awayTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">{fixture.awayTeam}</span>
                        </label>
                      )}
                    </div>
                  )}
                  {!hasAvailableTeam && (
                    <div className="text-yellow-600 text-xs mt-1">Both Teams Used</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={!selectedFixture || !selectedTeam || isSubmitting || isLocked}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
        >
          {isSubmitting ? "Submitting..." : "Submit Pick"}
        </button>
      </div>
    </form>
  )
}
