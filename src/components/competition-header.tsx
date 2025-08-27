"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import Image from "next/image"

interface CompetitionHeaderProps {
  competitionName: string
  season: string
  inviteCode: string
  currentUser: {
    name: string
    email: string
    image?: string
  }
}

export default function CompetitionHeader({ competitionName, season, inviteCode, currentUser }: CompetitionHeaderProps) {
  const getUserImage = (name: string) => {
    const nameLower = name.toLowerCase()
    let imageName = ''
    
    if (nameLower.includes('chris')) {
      imageName = 'chris.jpg'
    } else if (nameLower.includes('abboud')) {
      imageName = 'abboud.JPG'
    } else if (nameLower.includes('max')) {
      imageName = 'max.jpeg'
    } else if (nameLower.includes('jonah')) {
      imageName = 'jonah.jpeg'
    }
    
    return imageName
  }

  const userImageName = getUserImage(currentUser.name)
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {competitionName}
            </h1>
            <p className="text-gray-600">{season}</p>
          </div>
          <div className="flex items-center space-x-3">
            {userImageName ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={`/images/${userImageName}`}
                  alt={currentUser.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 text-sm flex items-center justify-center font-semibold border-2 border-gray-200">
                {currentUser.name.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700">{currentUser.name}</p>
              <p className="text-xs text-gray-500">Signed in</p>
            </div>
          </div>
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

