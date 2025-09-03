import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date, formatString: string = "PPP") {
  return format(date, formatString)
}

export function formatTimeUntil(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true })
}

export function isLocked(lockTime: Date) {
  return isAfter(new Date(), lockTime)
}

export function isBeforeLock(lockTime: Date) {
  return isBefore(new Date(), lockTime)
}

// Feature flags
export function isTiebreakEnabled(): boolean {
  return process.env.FEATURE_TIEBREAK === 'true'
}

export function toCompetitionTimezone(date: Date, timezone: string = "Europe/London") {
  return date // Simplified for now
}

export function fromCompetitionTimezone(date: Date, timezone: string = "Europe/London") {
  return date // Simplified for now
}

export function getFixtureOutcome(homeGoals: number | null, awayGoals: number | null, pickedTeam: string, homeTeam: string, awayTeam: string) {
  if (homeGoals === null || awayGoals === null) return null
  
  const isHomeTeam = pickedTeam === homeTeam
  const isAwayTeam = pickedTeam === awayTeam
  
  if (!isHomeTeam && !isAwayTeam) return null
  
  if (homeGoals > awayGoals) {
    return isHomeTeam ? 'WIN' : 'LOSS'
  } else if (awayGoals > homeGoals) {
    return isAwayTeam ? 'WIN' : 'LOSS'
  } else {
    return 'DRAW'
  }
}

export function getGoalDifference(homeGoals: number | null, awayGoals: number | null, pickedTeam: string, homeTeam: string, awayTeam: string) {
  if (homeGoals === null || awayGoals === null) return 0
  
  const isHomeTeam = pickedTeam === homeTeam
  const isAwayTeam = pickedTeam === awayTeam
  
  if (!isHomeTeam && !isAwayTeam) return 0
  
  if (isHomeTeam) {
    return homeGoals - awayGoals
  } else {
    return awayGoals - homeGoals
  }
}

export const PREMIER_LEAGUE_TEAMS = [
  "Arsenal",
  "Aston Villa", 
  "Bournemouth",
  "Brentford",
  "Brighton & Hove Albion",
  "Burnley",
  "Chelsea",
  "Crystal Palace",
  "Everton",
  "Fulham",
  "Liverpool",
  "Luton Town",
  "Manchester City",
  "Manchester United",
  "Newcastle United",
  "Nottingham Forest",
  "Sheffield United",
  "Tottenham Hotspur",
  "West Ham United",
  "Wolverhampton Wanderers"
] as const

export type PremierLeagueTeam = typeof PREMIER_LEAGUE_TEAMS[number]

export function isValidTeam(team: string): team is PremierLeagueTeam {
  return PREMIER_LEAGUE_TEAMS.includes(team as PremierLeagueTeam)
}


