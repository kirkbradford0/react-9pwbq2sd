import type { ActivityCategory, ActivityEntry } from "@/types";

// ============================================================
// SECTION MAPPING
// Multiple categories can map to a single report section
// ============================================================
export const REPORT_SECTION_MAP: Record<ActivityCategory, string> = {
  housing: "Housing Stability",
  employment: "Employment and Job Search",
  treatment: "Treatment and Recovery",
  recovery: "Treatment and Recovery",
  legal: "Legal Compliance",
  financial: "Financial Responsibility",
  health: "Health and Appointments",
  education: "Education and Skill Building",
  community: "Community and Family Involvement",
  family: "Community and Family Involvement",
  transportation: "Transportation Stability",
  other: "Additional Notes",
};

// Canonical section key for grouping (collapses treatment+recovery, community+family)
export const SECTION_KEY_MAP: Record<ActivityCategory, string> = {
  housing: "housing",
  employment: "employment",
  treatment: "treatment",
  recovery: "treatment", // merged
  legal: "legal",
  financial: "financial",
  health: "health",
  education: "education",
  community: "community",
  family: "community", // merged
  transportation: "transportation",
  other: "other",
};

// Preferred display order in the report
const SECTION_ORDER: string[] = [
  "legal",
  "housing",
  "employment",
  "financial",
  "treatment",
  "health",
  "education",
  "community",
  "transportation",
  "other",
];

// ============================================================
// GROUP ACTIVITIES BY SECTION KEY
// ============================================================
export function groupActivitiesBySection(
  activities: ActivityEntry[]
): Record<string, ActivityEntry[]> {
  const groups: Record<string, ActivityEntry[]> = {};

  for (const activity of activities) {
    const key = SECTION_KEY_MAP[activity.category] ?? "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(activity);
  }

  return groups;
}

// ============================================================
// SORT SECTIONS IN PREFERRED DISPLAY ORDER
// ============================================================
export function sortedSectionKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ============================================================
// SECTION NARRATIVE BUILDER
// Plain language. Agency-readable. No AI flourishes.
// ============================================================
export function buildSectionNarrative(
  key: string,
  entries: ActivityEntry[]
): string {
  const count = entries.length;

  if (count === 0) {
    return "No reportable activity was recorded in this section during the reporting period.";
  }

  const verifiedCount = entries.filter((e) =>
    ["documented", "partially_verified", "verified"].includes(
      e.verification_status
    )
  ).length;

  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;
  const wasWere = (n: number) => (n === 1 ? "was" : "were");

  switch (key) {
    case "financial":
      return `During the reporting period, the participant recorded ${plural(count, "financial responsibility item")}, with ${verifiedCount} supported by documentation or other evidence.`;

    case "employment":
      return `During the reporting period, the participant recorded ${plural(count, "employment-related activity item")}, including job search or work-related efforts. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    case "treatment":
      return `During the reporting period, the participant logged ${plural(count, "treatment or recovery-related activity item")}. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    case "housing":
      return `During the reporting period, the participant documented ${plural(count, "housing stability item")}. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    case "legal":
      return `During the reporting period, the participant recorded ${plural(count, "legal compliance item")}. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    case "health":
      return `During the reporting period, the participant documented ${plural(count, "health-related activity item")}. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    case "education":
      return `During the reporting period, the participant recorded ${plural(count, "education or skill-building item")}. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    case "community":
      return `During the reporting period, the participant documented ${plural(count, "community or family involvement item")}. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    case "transportation":
      return `During the reporting period, the participant recorded ${plural(count, "transportation-related item")}. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;

    default: {
      const title =
        REPORT_SECTION_MAP[key as ActivityCategory] ?? "Additional Notes";
      return `During the reporting period, the participant recorded ${plural(count, "item")} in the ${title} section. ${plural(verifiedCount, "item")} ${wasWere(verifiedCount)} supported by documentation or evidence.`;
    }
  }
}
