import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import type { ProcessSortKey } from "@/store";
import type { ProcessRecord, ProcessStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Search, ChevronUp, ChevronDown, Skull, RefreshCw } from "lucide-react";
import { killProcess, listProcessesPaged } from "@/lib/invoke";

const PAGE_SIZE = 50;

const STATUS_COLORS: Record<ProcessStatus, string> = {
  Running: "var(--color-green)",
  Terminated: "var(--text-muted)",
  Suspicious: "var(--color-orange)",
  Trusted: "var(--color-blue)",
};

export default function ProcessesPage() {
  const {
    processSearch, setProcessSearch,
    processSortKey, processSortAsc, setProcessSort,
    processStatusFilter, setProcessStatusFilter,
  } = useAppStore();
  const navigate = useNavigate();

  // Server-side data
  const [rows, setRows] = useState<ProcessRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  // Debounced search — only send query after user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState(processSearch);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(processSearch);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [processSearch]);

  // Reset to page 0 when filter or sort changes
  useEffect(() => { setPage(0); }, [processStatusFilter, processSortKey, processSortAsc]);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await listProcessesPaged(
        debouncedSearch,
        processStatusFilter,
        processSortKey,
        processSortAsc,
        PAGE_SIZE,
        p * PAGE_SIZE,
      );
      setRows(result.processes);
      setTotal(result.total);
    } catch (err) {
      console.error("Failed to fetch processes:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, processStatusFilter, processSortKey, processSortAsc]);

  useEffect(() => { fetchPage(page); }, [fetchPage, page]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchPage(page), 30000);
    return () => clearInterval(interval);
  }, [fetchPage, page]);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [killing, setKilling] = useState(false);

  const allSelected = rows.length > 0 && rows.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((p) => p.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkKill = async () => {
    const targets = rows.filter((p) => selected.has(p.id));
    if (targets.length === 0) return;
    if (!confirm(`Kill ${targets.length} selected process${targets.length > 1 ? "es" : ""}?`)) return;
    setKilling(true);
    for (const p of targets) {
      try { await killProcess(p.pid, p.id); } catch { /* ignore individual failures */ }
    }
    setKilling(false);
    setSelected(new Set());
    fetchPage(page);
  };

  const handleSort = (key: ProcessSortKey) => {
    if (processSortKey === key) setProcessSort(key, !processSortAsc);
    else setProcessSort(key, false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SortIcon = ({ col }: { col: ProcessSortKey }) =>
    processSortKey === col ? (
      processSortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    ) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={styles.pageTitle}>Processes</h1>
        <button
          className="btn btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          onClick={() => fetchPage(page)}
          disabled={loading}
        >
          <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : undefined} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Search by name, PID, or path…"
            value={processSearch}
            onChange={(e) => setProcessSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ width: 160 }}
          value={processStatusFilter}
          onChange={(e) => setProcessStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="AtRisk">⚠ At Risk</option>
          <option value="Suspicious">Suspicious</option>
          <option value="Running">Running</option>
          <option value="Trusted">Trusted</option>
          <option value="Terminated">Terminated</option>
        </select>
        {selected.size > 0 && (
          <button
            className="btn btn-danger"
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
            onClick={handleBulkKill}
            disabled={killing}
          >
            <Skull size={14} />
            Kill {selected.size} selected
          </button>
        )}
        <span style={styles.count}>{total} processes</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th onClick={() => handleSort("name")}>Name <SortIcon col="name" /></th>
                <th onClick={() => handleSort("pid")}>PID <SortIcon col="pid" /></th>
                <th onClick={() => handleSort("current_status")}>Status <SortIcon col="current_status" /></th>
                <th onClick={() => handleSort("risk_score")}>Risk <SortIcon col="risk_score" /></th>
                <th onClick={() => handleSort("signer_status")}>Signer <SortIcon col="signer_status" /></th>
                <th onClick={() => handleSort("first_seen_at")}>Started <SortIcon col="first_seen_at" /></th>
                <th onClick={() => handleSort("last_seen_at")}>Last Seen <SortIcon col="last_seen_at" /></th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/processes/${p.id}`)}
                  style={{ background: selected.has(p.id) ? "rgba(59,130,246,0.08)" : undefined }}
                >
                  <td onClick={(e) => { e.stopPropagation(); toggleOne(p.id); }}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="mono" style={{ fontWeight: 600 }}>{p.name}</td>
                  <td className="mono" style={{ color: "var(--text-secondary)" }}>{p.pid}</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: STATUS_COLORS[p.current_status], fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[p.current_status] }} />
                      {p.current_status}
                    </span>
                  </td>
                  <td><RiskBadge score={p.risk_score} /></td>
                  <td><SignerBadge status={p.signer_status} /></td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {formatDistanceToNow(new Date(p.first_seen_at), { addSuffix: true })}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {formatDistanceToNow(new Date(p.last_seen_at), { addSuffix: true })}
                  </td>
                  <td className="mono" style={{ color: "var(--text-muted)", fontSize: 11, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.exe_path ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading && (
            <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
              No processes match your filters
            </p>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Page {page + 1} of {totalPages} · {total} total
          </span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "var(--color-red)" : score >= 40 ? "var(--color-yellow)" : "var(--color-green)";
  return (
    <span style={{ display: "inline-block", minWidth: 36, padding: "2px 6px", borderRadius: 4, background: `${color}22`, color, fontWeight: 700, fontSize: 12, textAlign: "center" }}>
      {score}
    </span>
  );
}

function SignerBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Signed: "var(--color-green)",
    Unsigned: "var(--color-yellow)",
    InvalidSignature: "var(--color-red)",
    Unknown: "var(--text-muted)",
  };
  return <span style={{ color: map[status] ?? "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>{status}</span>;
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 0 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 14 },
  searchWrap: { flex: 1, position: "relative" },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" },
  count: { fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 12 },
};
