"use client";

import { useState, useEffect, useCallback } from "react";
import InputForm from "@/components/InputForm";
import ResultsTable, { OffenderCheck } from "@/components/ResultsTable";

interface CheckResult {
  offender_id: string;
  found: boolean | null;
  status: "found" | "not_found" | "unknown";
  checked_at: string;
  duration_ms: number;
}

export default function DashboardPage() {
  const [checks, setChecks] = useState<OffenderCheck[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchChecks = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/offender-checks?limit=200");
      const data = await res.json();
      if (data.checks) {
        setChecks(data.checks);
      }
    } catch (err) {
      console.error("Failed to fetch checks:", err);
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  function handleResult(result: CheckResult) {
    // Prepend the new result to the table immediately (optimistic)
    const newCheck: OffenderCheck = {
      id: crypto.randomUUID(),
      ...result,
      reentry: false,
    };
    setChecks((prev) => [newCheck, ...prev]);
    // Refresh from DB to get accurate re-entry annotations
    setTimeout(fetchChecks, 500);
  }

  function handleBatchResult(results: CheckResult[]) {
    fetchChecks();
    void results; // results already saved; refresh pulls them from DB
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Run a Check
        </h2>
        <InputForm onResult={handleResult} onBatchResult={handleBatchResult} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Verification History
        </h2>
        {initialLoading ? (
          <div className="text-sm text-gray-400 py-8 text-center">
            Loading history...
          </div>
        ) : (
          <ResultsTable
            checks={checks}
            onRefresh={fetchChecks}
            refreshing={refreshing}
          />
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          What to watch for
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
          <div>
            <span className="font-medium text-red-600">REENTRY</span> — an
            offender that was NOT FOUND in a prior run is now FOUND.
          </div>
          <div>
            <span className="font-medium text-yellow-600">UNKNOWN</span> — page
            timed out or search was inconclusive. Re-run manually.
          </div>
          <div>
            <span className="font-medium text-gray-600">Export CSV</span> — pull
            all results into a spreadsheet for analysis.
          </div>
        </div>
      </div>
    </div>
  );
}
