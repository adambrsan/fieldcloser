import { StatusBadge, fmtDateTime } from "./helpers.jsx";

export default function LeadList({
  leads, filtered, search, setSearch, showFilters, setShowFilters,
  sheets, sheetFilter, setSheetFilter, statuses, statusFilter, setStatusFilter,
  totalBySheet, selectLead, routeIds, toggleRoute, onOpenRoute,
  onAddLead, onImport, onExport, loading
}) {
  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="font-bold text-gray-900 leading-tight">Ultimate Salesman</div>
              <div className="text-xs text-gray-400">{loading ? "Loading…" : `${leads.length} leads loaded`}</div>
            </div>
          </div>
          <button onClick={() => setShowFilters(s => !s)}
            className={`text-sm px-3 py-2 rounded-xl font-medium ${showFilters ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-600"}`}>
            Filters {sheetFilter !== "All" || statusFilter !== "All" ? "•" : ""}
          </button>
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2 mb-2">
          <button onClick={onAddLead}
            className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl active:bg-blue-700">
            ➕ Add Lead
          </button>
          <button onClick={onImport}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2 rounded-xl active:bg-gray-200">
            📤 Import CSV
          </button>
          <button onClick={onExport}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2 rounded-xl active:bg-gray-200">
            📥 Export CSV
          </button>
        </div>

        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Search name, #, address, phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {showFilters && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {sheets.map(s => (
                <button key={s} onClick={() => setSheetFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sheetFilter === s ? "bg-slate-700 text-white border-slate-700" : "bg-white text-gray-500 border-gray-300"}`}>
                  {s}{s !== "All" && totalBySheet[s] ? ` (${totalBySheet[s]})` : ""}
                </button>
              ))}
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-slate-400">
              {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
            </select>
          </div>
        )}
        <div className="text-xs text-gray-400 mt-1.5">{filtered.length} shown{filtered.length === 100 ? " (first 100)" : ""}</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {filtered.map(lead => {
          const inRoute = routeIds.includes(lead.id);
          return (
          <div key={lead.id}
            className="px-4 py-3 border-b border-gray-100 active:bg-slate-50 transition-colors flex items-center gap-2">
            <div onClick={() => selectLead(lead)} className="flex-1 min-w-0 cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-800 text-base truncate">{lead.first_name} {lead.last_name} <span className="text-gray-400 font-normal text-xs">#{lead.lead_num}</span></span>
                <StatusBadge status={lead.status} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">{lead.city} · {lead.lead_type}</div>
              <div className="flex gap-3 mt-1.5 items-center flex-wrap">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>AM</span>
                  {[0,1,2].map(i => <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i < (lead.am_nh || 0) ? "bg-blue-400" : "bg-gray-200"}`} />)}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>PM</span>
                  {[0,1,2].map(i => <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i < (lead.pm_nh || 0) ? "bg-purple-400" : "bg-gray-200"}`} />)}
                </div>
                {lead.appointment && <span className="text-xs text-green-600 font-medium">📅 {fmtDateTime(lead.appointment.appt_date, lead.appointment.appt_time)}</span>}
                {lead.reminder && !lead.appointment && <span className="text-xs text-amber-500">⏰ {fmtDateTime(lead.reminder.reminder_date, lead.reminder.reminder_time)}</span>}
              </div>
            </div>
            <button onClick={() => toggleRoute(lead)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl ${inRoute ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
              {inRoute ? "✓ Route" : "+ Route"}
            </button>
          </div>
          );
        })}
        {!loading && filtered.length === 0 && <div className="text-center text-gray-400 py-10 text-sm">No leads found</div>}
        {loading && <div className="text-center text-gray-400 py-10 text-sm">Loading leads…</div>}
      </div>

      {/* Persistent Route Bar */}
      {routeIds.length > 0 && (
        <button onClick={onOpenRoute}
          className="absolute bottom-16 left-0 right-0 bg-blue-600 text-white py-3 px-4 flex items-center justify-between font-semibold text-sm shadow-lg active:bg-blue-700">
          <span>🚗 Route ({routeIds.length} stop{routeIds.length !== 1 ? "s" : ""})</span>
          <span>View →</span>
        </button>
      )}
    </div>
  );
}
