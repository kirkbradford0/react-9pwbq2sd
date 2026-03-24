// FM Safe Mode Score — behavioral governor
// Combines multiple signals into a single state score.
// If score < SAFE_THRESHOLD, Safe Mode activates.

export const SAFE_THRESHOLD = 40

export interface FMScoreInputs {
  /** 0–100: user's logged mood (from check-in) */
  moodScore?: number
  /** hours of sleep logged */
  sleepHours?: number
  /** 0–100: self-reported stress level */
  stressScore?: number
  /** number of failed/missed activities in last 7 days */
  recentFailures?: number
  /** current hour of day (0–23) — penalises late-night use */
  hourOfDay?: number
  /** true if system is actively pushing an update */
  isUpdateMode?: boolean
}

export interface FMScoreResult {
  score: number
  isSafeMode: boolean
  reasons: string[]
}

export function computeFMScore(inputs: FMScoreInputs): FMScoreResult {
  const {
    moodScore = 100,
    sleepHours = 8,
    stressScore = 0,
    recentFailures = 0,
    hourOfDay = 12,
    isUpdateMode = false,
  } = inputs

  const reasons: string[] = []
  let score = 100

  // Mood (weight: 35pts)
  const moodContribution = (moodScore / 100) * 35
  score -= 35 - moodContribution
  if (moodScore < 50) reasons.push(`Low mood (${moodScore}/100)`)

  // Sleep (weight: 20pts) — 7h = full, <5h = 0
  const sleepClamped = Math.min(Math.max(sleepHours, 0), 9)
  const sleepContribution = (sleepClamped / 7) * 20
  score -= Math.max(0, 20 - sleepContribution)
  if (sleepHours < 6) reasons.push(`Low sleep (${sleepHours}h)`)

  // Stress (weight: 20pts) — inverse
  const stressContribution = ((100 - stressScore) / 100) * 20
  score -= 20 - stressContribution
  if (stressScore > 60) reasons.push(`High stress (${stressScore}/100)`)

  // Recent failures (weight: 15pts) — each failure = -5pts, max -15
  const failurePenalty = Math.min(recentFailures * 5, 15)
  score -= failurePenalty
  if (recentFailures > 1) reasons.push(`${recentFailures} recent missed activities`)

  // Time of day (weight: 10pts) — penalise midnight–5am
  const isLateNight = hourOfDay >= 0 && hourOfDay < 5
  if (isLateNight) {
    score -= 10
    reasons.push("Late-night session")
  }

  // Update mode override — hard floor
  if (isUpdateMode) {
    score = Math.min(score, 30)
    reasons.push("System update in progress")
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, score)))

  return {
    score: finalScore,
    isSafeMode: finalScore < SAFE_THRESHOLD,
    reasons,
  }
}
