import Image from 'next/image'

interface TeamCrestProps {
  teamName: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
}

const teamLogoMap: Record<string, string> = {
  'Arsenal': '/images/arsenal.png',
  'Aston Villa': '/images/astonvilla.png',
  'Bournemouth': '/images/bournemouth.png',
  'Brentford': '/images/brentford.png',
  'Brighton & Hove Albion': '/images/brighton.png',
  'Burnley': '/images/burnley.png',
  'Chelsea': '/images/chelsea.png',
  'Crystal Palace': '/images/crystalpalace.png',
  'Everton': '/images/everton.png',
  'Fulham': '/images/fulham.png',
  'Leeds United': '/images/leeds.png',
  'Liverpool': '/images/liverpool.png',
  'Manchester City': '/images/mancity.png',
  'Manchester United': '/images/manutd.png',
  'Newcastle United': '/images/newcastle.png',
  'Nottingham Forest': '/images/nottinghamforest.png',
  'Sunderland': '/images/sunderland.png',
  'Tottenham Hotspur': '/images/tottenham.png',
  'West Ham United': '/images/westham.png',
  'Wolverhampton Wanderers': '/images/wolves.png'
}

export default function TeamCrest({ teamName, size = 'md' }: TeamCrestProps) {
  const logoPath = teamLogoMap[teamName]
  
  if (!logoPath) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600`}>
        {teamName.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <Image
        src={logoPath}
        alt={`${teamName} logo`}
        fill
        className="object-contain"
        sizes={size === 'sm' ? '24px' : size === 'md' ? '32px' : '48px'}
      />
    </div>
  )
}
