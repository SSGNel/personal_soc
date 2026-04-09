import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { ActivityEvent } from "@/types";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle, Play, Square, Shield, Rocket, User, RefreshCw, Search,
  ChevronLeft, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { listActivityEventsPaged } from "@/lib/invoke";

type EventFilter = "all" | "process_created" | "process_terminated" | "alert" | "startup" | "user_action";
type SevFilter = "all" | "high" | "medium" | "low" | "info";

const PAGE_SIZE = 50;

const EVENT_ICONS: Record<string, LucideIcon> = {
  process_created: Play,
  process_terminated: Square,
  alert: AlertTriangle,
  startup: Rocket,
  user_action: User,
};

const SEV_COLORS: Record<string, string> = {
  high: "var(--color-red)",
  medium: "var(--color-orange)",
  low: "var(--color-yellow)",
  info: "var(--color-blue)",
};

const TYPE_LABELS: Record<string, string> = {
  process_created: "Process Started",
  process_terminated: "Process Ended",
  alert: "Alert",
  startup: "Startup",
  user_action: "User Action",
};

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EventFilter>("all");
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const [search, setSearch] = useState("");

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await listActivityEventsPaged(PAGE_SIZE, p * PAGE_SIZE);
      setEvents(result.events);
      setTotal(result.total);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(page); }, [fetchPage, page]);
  useEffect(() => {
    const interval = setInterval(() => fetchPage(page), 30000);
    return () => clearInterval(interval);
  }, [fetchPage, page]);

  // Client-side filter on the current page
  const filtered = events.filter((e) => {
    if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
    if (sevFilter !== "all" && e.severity !== sevFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.title.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleTypeFilter = (v: EventFilter) => { setTypeFilter(v); setPage(0); };
  const handleSevFilter = (v: SevFilter) => { setSevFilter(v); setPage(0); };

  const handleEventClick = (e: ActivityEvent) => {
    if (e.event_type === "alert" && e.related_id) {
      navigate("/alerts");
    } else if ((e.event_type === "process_created" || e.event_type === "process_terminated") && e.related_id) {
      navigate(`/processes/${e.related_id}`);
    } else if (e.event_type === "startup" && e.related_id) {
      navigate("/startup");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={styles.pageTitle}>Event Log</h1>
          <p style={styles.subtitle}>Security timeline — processes, alerts, startup changes, and user actions</p>
        </div>
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

      {/* Filters */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={13} style={styles.searchIcon} />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: 170 }} value={typeFilter} onChange={(e) => handleTypeFilter(e.target.value as EventFilter)}>
          <option value="all">All types</option>
          <option value="alert">Alerts</option>
          <option value="process_created">Process Started</option>
          <option value="process_terminated">Process Ended</option>
          <option value="startup">Startup</option>
          <option value="user_action">User Actions</option>
        </select>
        <select className="input" style={{ width: 140 }} value={sevFilter} onChange={(e) => handleSevFilter(e.target.value as SevFilter)}>
          <option value="all">All severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
        <span style={styles.count}>{filtered.length} / {total} events</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            {loading ? "Loading events…" : "No events match your filters"}
          </p>
        ) : (
          <div style={styles.timeline}>
            {filtered.map((ev, i) => {
              const Icon: LucideIcon = EVENT_ICONS[ev.event_type] ?? Shield;
              const color = SEV_COLORS[ev.severity] ?? "var(--color-blue)";
              const isClickable = !!ev.related_id && ev.event_type !== "user_action";
              return (
                <div
                  key={ev.id + i}
                  style={{
                    ...styles.eventRow,
                    cursor: isClickable ? "pointer" : "default",
                  }}
                  onClick={isClickable ? () => handleEventClick(ev) : undefined}
                >
                  {/* Icon + connector */}
                  <div style={styles.iconCol}>
                    <div style={{ ...styles.iconWrap, background: `${color}18`, border: `1px solid ${color}40` }}>
                      <Icon size={13} color={color} />
                    </div>
                    {i < filtered.length - 1 && <div style={styles.connector} />}
                  </div>

                  {/* Content */}
                  <div style={styles.content}>
                    <div style={styles.contentRow}>
                      <span className={`badge badge-${ev.severity}`} style={{ fontSize: 10 }}>
                        {ev.severity}
                      </span>
                      <span style={styles.typeLabel}>{TYPE_LABELS[ev.event_type] ?? ev.event_type}</span>
                      <span style={styles.time}>
                        {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div style={styles.title}>{ev.title}</div>
                    {ev.description && (
                      <div style={styles.desc} className="mono">{ev.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 8px" }}
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={styles.pageInfo}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 8px" }}
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 12, color: "var(--text-muted)", marginTop: 0 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 14 },
  searchWrap: { flex: 1, position: "relative" },
  searchIcon: {
    position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
    color: "var(--text-muted)", pointerEvents: "none",
  },
  count: { fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" },
  timeline: { display: "flex", flexDirection: "column" },
  eventRow: {
    display: "flex",
    gap: 0,
    padding: "0 14px",
    borderBottom: "1px solid var(--border)",
    transition: "background 0.1s",
  },
  iconCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 12,
    paddingRight: 14,
    flexShrink: 0,
    width: 36,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  connector: {
    flex: 1,
    width: 1,
    background: "var(--border)",
    minHeight: 8,
    marginTop: 4,
  },
  content: { flex: 1, paddingTop: 10, paddingBottom: 10 },
  contentRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  typeLabel: { fontSize: 11, color: "var(--text-muted)", fontWeight: 500 },
  time: { fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" },
  title: { fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 },
  desc: {
    fontSize: 11, color: "var(--text-muted)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
  },
  pagination: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 12, marginTop: 12,
  },
  pageInfo: { fontSize: 12, color: "var(--text-muted)" },
};
