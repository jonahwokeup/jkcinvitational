import Link from "next/link"
import { Trophy, Users, Calendar, Target, Clock, AlertTriangle } from "lucide-react"

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Rules</h1>
              <p className="text-gray-600">How to play the JKC Invitational</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Overview</h2>
          <p className="text-gray-700 mb-4">
            The JKC Invitational is a Premier League &quot;Last Man Standing&quot; competition where players 
            pick one team per gameweek and survive elimination to win rounds and ultimately become 
            the Season Champion.
          </p>
        </div>

        {/* Core Rules */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Core Rules</h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Target className="w-6 h-6 text-green-600 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Team Selection</h3>
                <ul className="text-gray-700 space-y-1">
                  <li>• Pick one Premier League team per gameweek before the lock time</li>
                  <li>• You cannot reuse a team within the same round</li>
                  <li>• Picks are hidden until the gameweek locks</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Trophy className="w-6 h-6 text-yellow-600 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Survival & Elimination</h3>
                <ul className="text-gray-700 space-y-1">
                  <li>• Win = survive to the next gameweek</li>
                  <li>• Draw/Loss = eliminated from the current round</li>
                  <li>• Last survivor wins the round</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Calendar className="w-6 h-6 text-blue-600 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Rounds</h3>
                <ul className="text-gray-700 space-y-1">
                  <li>• Each round starts with all players having 1 life</li>
                  <li>• Round ends when only one player remains</li>
                  <li>• New round begins automatically with all teams available again</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Clock className="w-6 h-6 text-red-600 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Lock Times</h3>
                <ul className="text-gray-700 space-y-1">
                  <li>• Gameweeks lock at the first kickoff time</li>
                  <li>• No picks can be made after lock time</li>
                  <li>• All picks are revealed after lock</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Tie-Breakers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tie-Breakers</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">2 Survivors, No Winners</h3>
              <p className="text-gray-700 mb-2">
                If two players remain and neither picks a winning team:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>• Higher goal difference = winner</li>
                <li>• If both draw, draw &gt; loss</li>
                <li>• If still tied, round is declared a draw and a new round begins</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Season Champion</h3>
              <p className="text-gray-700 mb-2">
                At the end of the season, the champion is determined by:
              </p>
              <ol className="text-gray-700 space-y-1 ml-4">
                <li>1. Most round wins</li>
                <li>2. Most total gameweeks survived</li>
                <li>3. Earliest first round win date</li>
                <li>4. Fewest missed picks</li>
                <li>5. Admin decision (if still tied)</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Scoring System</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Round Points</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Round Win</span>
                  <span className="font-semibold text-green-600">1 point</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Round Loss</span>
                  <span className="font-semibold text-red-600">0 points</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Statistics Tracked</h3>
              <ul className="text-gray-700 space-y-1">
                <li>• Round wins</li>
                <li>• Gameweeks survived</li>
                <li>• Missed picks</li>
                <li>• First round win date</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-yellow-900 mb-2">Important Notes</h3>
              <ul className="text-yellow-800 space-y-1">
                <li>• You must make a pick before each gameweek locks</li>
                <li>• No team can be used twice in the same round</li>
                <li>• Picks are final once submitted</li>
                <li>• Round winners are determined automatically</li>
                <li>• The season runs for the full Premier League campaign</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Join CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Play?</h2>
          <p className="text-gray-600 mb-6">
            Join the JKC Invitational and compete for the title of Season Champion!
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Join Competition
          </Link>
        </div>
      </div>
    </div>
  )
}
