import Link from 'next/link'
import { Trophy, Users, Calendar, Target } from 'lucide-react'
import AuthStatus from '@/components/auth-status'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4">
            JKC Invitational
          </h1>
          <p className="text-2xl text-green-100 mb-8">
            Premier League Last Man Standing
          </p>
          <p className="text-xl text-green-200 max-w-3xl mx-auto">
            Join the ultimate Premier League survival competition. Pick one team per gameweek, 
            survive elimination, and become the Season Champion!
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Round Winners</h3>
            <p className="text-green-100">Win rounds by being the last survivor</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Friends & Family</h3>
            <p className="text-green-100">Compete with your closest friends</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <Calendar className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Season Long</h3>
            <p className="text-green-100">Full Premier League season competition</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <Target className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Strategic Picks</h3>
            <p className="text-green-100">Choose wisely - no team reuse per round</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Sign In</h3>
              <p className="text-green-100">
                Use your access code to sign in and join the competition
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Pick Teams</h3>
              <p className="text-green-100">
                Choose one Premier League team per gameweek (no reuse per round)
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Survive & Win</h3>
              <p className="text-green-100">
                Win = survive. Draw/Loss = eliminated. Last survivor wins the round
              </p>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="text-center">
          <AuthStatus />
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-green-200">
          <p>&copy; 2025 JKC Invitational. Premier League Last Man Standing.</p>
        </div>
      </div>
    </div>
  )
}
