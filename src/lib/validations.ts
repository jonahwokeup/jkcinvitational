import { z } from "zod"
import { PREMIER_LEAGUE_TEAMS } from "./utils"

export const joinCompetitionSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
})

export const createPickSchema = z.object({
  fixtureId: z.string().min(1, "Fixture is required"),
  team: z.string().min(1, "Team is required"),
})

export const importFixturesSchema = z.object({
  gameweekNumber: z.number().min(1, "Gameweek number must be at least 1"),
  fixtures: z.array(z.object({
    homeTeam: z.enum(PREMIER_LEAGUE_TEAMS as unknown as [string, ...string[]]),
    awayTeam: z.enum(PREMIER_LEAGUE_TEAMS as unknown as [string, ...string[]]),
    kickoff: z.string().datetime(),
  })).min(1, "At least one fixture is required"),
})

export const updateFixtureSchema = z.object({
  homeGoals: z.number().min(0).nullable(),
  awayGoals: z.number().min(0).nullable(),
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "ABANDONED"]),
})

export const endSeasonSchema = z.object({
  confirm: z.boolean().refine(val => val === true, {
    message: "You must confirm to end the season",
  }),
})

export type JoinCompetitionInput = z.infer<typeof joinCompetitionSchema>
export type CreatePickInput = z.infer<typeof createPickSchema>
export type ImportFixturesInput = z.infer<typeof importFixturesSchema>
export type UpdateFixtureInput = z.infer<typeof updateFixtureSchema>
export type EndSeasonInput = z.infer<typeof endSeasonSchema>
