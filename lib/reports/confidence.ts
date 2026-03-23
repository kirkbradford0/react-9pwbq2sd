import type { VerificationStatus } from "@/types";

export const VERIFICATION_WEIGHTS: Record<VerificationStatus, number> = {
  missing: 0,
  self_reported: 25,
  documented: 60,
  partially_verified: 75,
  verified: 95,
};

export function computeSectionConfidence(
  entries: Array<{ verification_status: VerificationStatus }>
): number {
  if (!entries.length) return 0;

  const total = entries.reduce((sum, entry) => {
    return sum + VERIFICATION_WEIGHTS[entry.verification_status];
  }, 0);

  return Math.round(total / entries.length);
}
