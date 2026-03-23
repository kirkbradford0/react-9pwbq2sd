/**
 * Utah DOC Offender Verification Checker
 *
 * Uses Playwright (server-side only) to search the Utah Department of Corrections
 * offender lookup and return whether the given offender ID is currently in the system.
 *
 * IMPORTANT: This file is server-side only. Never import it in client components.
 */

export type CheckStatus = "found" | "not_found" | "unknown";

export interface CheckResult {
  offender_id: string;
  found: boolean | null; // null = unknown (timeout / error)
  status: CheckStatus;
  checked_at: string;
  raw_response: string;
  duration_ms: number;
}

// Utah DOC offender search URL
const UTAH_DOC_SEARCH_URL =
  "https://corrections.utah.gov/index.php/component/offendersearch";

// How long to wait for the results page (ms)
const PAGE_TIMEOUT_MS = 20_000;

export async function checkOffender(offenderId: string): Promise<CheckResult> {
  const startedAt = Date.now();
  const checked_at = new Date().toISOString();

  // Use @sparticuz/chromium on Vercel (serverless), fall back to system chromium locally
  const chromiumPkg = await import("@sparticuz/chromium");
  const { chromium } = await import("playwright-core");

  const isVercel = !!process.env.VERCEL;
  const executablePath = isVercel
    ? await chromiumPkg.default.executablePath()
    : undefined; // playwright-core will find local chromium

  const args = isVercel
    ? [...chromiumPkg.default.args, "--disable-web-security"]
    : ["--no-sandbox", "--disable-setuid-sandbox"];

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args,
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (compatible; JournalismBot/1.0; research purposes)",
    });

    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    // Navigate to the search page
    await page.goto(UTAH_DOC_SEARCH_URL, { waitUntil: "domcontentloaded" });

    // Fill in the offender number field
    // The Utah DOC site uses a form with an offender number input
    const inputSelectors = [
      'input[name*="offender"]',
      'input[id*="offender"]',
      'input[placeholder*="offender"]',
      'input[placeholder*="number"]',
      'input[name*="number"]',
      'input[type="text"]',
    ];

    let filled = false;
    for (const selector of inputSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible().catch(() => false)) {
        await el.fill(offenderId.trim());
        filled = true;
        break;
      }
    }

    if (!filled) {
      throw new Error("Could not find offender ID input on the page");
    }

    // Submit the form
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS }).catch(() => null),
      page.keyboard.press("Enter"),
    ]);

    // Grab all text from the page for analysis + logging
    const pageText = await page.evaluate(() => document.body.innerText);
    const duration_ms = Date.now() - startedAt;

    // Detection logic — Utah DOC shows "Offender Details" when a record is found
    const normalizedText = pageText.toLowerCase();
    const found =
      normalizedText.includes("offender details") ||
      normalizedText.includes("offender information") ||
      normalizedText.includes("date of birth") ||
      normalizedText.includes("commitment");

    const notFound =
      normalizedText.includes("no results") ||
      normalizedText.includes("not found") ||
      normalizedText.includes("no offender") ||
      normalizedText.includes("no records") ||
      normalizedText.includes("your search returned 0");

    let status: CheckStatus;
    if (found) {
      status = "found";
    } else if (notFound) {
      status = "not_found";
    } else {
      // Page loaded but we can't determine — log raw text and mark unknown
      status = "unknown";
    }

    return {
      offender_id: offenderId.trim(),
      found: status === "found" ? true : status === "not_found" ? false : null,
      status,
      checked_at,
      raw_response: pageText.slice(0, 2000), // cap stored text at 2k chars
      duration_ms,
    };
  } catch (err: unknown) {
    const duration_ms = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    return {
      offender_id: offenderId.trim(),
      found: null,
      status: "unknown",
      checked_at,
      raw_response: `ERROR: ${message}`,
      duration_ms,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}

/** Delay helper for batch runs */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
