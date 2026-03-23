"use client";

import { useState, useCallback } from "react";

export interface OffenderCheck {
  id: string;
  offender_id: string;
  found: boolean | null;
  status: "found" | "not_found" | "unknown";
  checked_at: string;
  duration_ms: number | null;
  reentry?: boolean;
}

interface ResultsTableProps {
  checks: OffenderCheck[];
  onRefresh: () => void;
  refreshing: boolean;
}

export default function ResultsTable({
  checks,
  onRefresh,
  refreshing,
}: ResultsTableProps) {
  const [filter, setFilter] = useState("");

  const filtered = checks.filter(
    (c) =>
      !filter ||
      c.offender_id.toLowerCase().includes(filter.toLowerCase()) ||
      c.status.includes(filter.toLowerCase())
  );

  const handleExportCSV = useCallback(() => {
    const header = "offender_id,status,found,reentry,checked_at,duration_ms";
    const rows = filtered.map((c) =>
      [
        c.offender_id,
        c.status,
        c.found === null ? "unknown" : c.found ? "YES" : "NO",
        c.reentry ? "YES" : "NO",
        c.checked_at,
        c.duration_ms ?? "",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offender-checks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const statusCounts = {
    found: checks.filter((c) => c.status === "found").length,
    not_found: checks.filter((c) => c.status === "not_found").length,
    unknown: checks.filter((c) => c.status === "unknown").length,
    reentry: checks.filter((c) => c.reentry).length,
  };

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Found" value={statusCounts.found} color="green" />
        <StatCard label="Not Found" value={statusCounts.not_found} color="gray" />
        <StatCard label="Unknown" value={statusCounts.unknown} color="yellow" />
        <StatCard
          label="Re-entry Signals"
          value={statusCounts.reentry}
          color="red"
          bold
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by ID or status..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Offender ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Found
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Signal
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Checked At
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No results yet. Run a check above.
                  </td>
                </tr>
              ) : (
                filtered.map((check) => (
                  <tr
                    key={check.id}
                    className={
                      check.reentry
                        ? "bg-red-50"
                        : check.status === "found"
                        ? "bg-green-50"
                        : ""
                    }
                  >
                    <td className="px-4 py-3 font-mono text-gray-800">
                      {check.offender_id}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={check.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {check.found === null
                        ? "—"
                        : check.found
                        ? "YES"
                        : "NO"}
                    </td>
                    <td className="px-4 py-3">
                      {check.reentry && (
                        <span className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                          REENTRY
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(check.checked_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {check.duration_ms != null
                        ? `${(check.duration_ms / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400">
          Showing {filtered.length} of {checks.length} records
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    found: "bg-green-100 text-green-800",
    not_found: "bg-gray-100 text-gray-600",
    unknown: "bg-yellow-100 text-yellow-700",
  };
  const labels: Record<string, string> = {
    found: "FOUND",
    not_found: "NOT FOUND",
    unknown: "UNKNOWN",
  };
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {labels[status] ?? status.toUpperCase()}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: number;
  color: "green" | "gray" | "yellow" | "red";
  bold?: boolean;
}) {
  const colorMap: Record<string, string> = {
    green: "border-green-200 bg-green-50",
    gray: "border-gray-200 bg-gray-50",
    yellow: "border-yellow-200 bg-yellow-50",
    red: "border-red-200 bg-red-50",
  };
  const textMap: Record<string, string> = {
    green: "text-green-800",
    gray: "text-gray-700",
    yellow: "text-yellow-800",
    red: "text-red-800",
  };
  return (
    <div
      className={`border rounded-lg px-4 py-3 ${colorMap[color]}`}
    >
      <div
        className={`text-2xl font-bold ${textMap[color]} ${bold ? "font-black" : ""}`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
