"use client";

import { useState } from "react";

interface CheckResult {
  offender_id: string;
  found: boolean | null;
  status: "found" | "not_found" | "unknown";
  checked_at: string;
  duration_ms: number;
  warning?: string;
}

interface BatchResult {
  total: number;
  results: CheckResult[];
  errors?: { offender_id: string; error: string }[];
}

interface InputFormProps {
  onResult: (result: CheckResult) => void;
  onBatchResult: (results: CheckResult[]) => void;
}

export default function InputForm({ onResult, onBatchResult }: InputFormProps) {
  const [singleId, setSingleId] = useState("");
  const [batchText, setBatchText] = useState("");
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);

  async function handleSingleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!singleId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offender_id: singleId.trim() }),
      });

      const data: CheckResult = await res.json();

      if (!res.ok && res.status !== 207) {
        setError((data as unknown as { error: string }).error ?? "Check failed");
        return;
      }

      onResult(data);
      setSingleId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchCheck(e: React.FormEvent) {
    e.preventDefault();

    const ids = batchText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) return;

    setLoading(true);
    setError(null);
    setBatchProgress(`Running batch check on ${ids.length} IDs...`);

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offender_ids: ids }),
      });

      const data: BatchResult = await res.json();

      if (!res.ok) {
        setError((data as unknown as { error: string }).error ?? "Batch failed");
        return;
      }

      setBatchProgress(
        `Done: ${data.results.length} checked${data.errors ? `, ${data.errors.length} errors` : ""}`
      );
      onBatchResult(data.results);
      setBatchText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setMode("single")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "single"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Single Check
        </button>
        <button
          onClick={() => setMode("batch")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "batch"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Batch Run
        </button>
      </div>

      {mode === "single" ? (
        <form onSubmit={handleSingleCheck} className="flex gap-3">
          <input
            type="text"
            value={singleId}
            onChange={(e) => setSingleId(e.target.value)}
            placeholder="Enter offender ID (e.g. 12345)"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !singleId.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Checking..." : "Check"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBatchCheck} className="space-y-3">
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={"Paste offender IDs — one per line or comma-separated:\n12345\n67890\n11111"}
            rows={6}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !batchText.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Running batch..." : "Batch Run"}
            </button>
            {batchProgress && (
              <span className="text-sm text-gray-500">{batchProgress}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            7-second delay between checks. Max 100 per run. This will take a while.
          </p>
        </form>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
