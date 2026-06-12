import { fmtDateTime, getDateRange, parsePremium, exportSalesCSV } from "./helpers.jsx";
import { useState, useMemo } from "react";

// ════════════════════════════════════════════════════════════════
// SCHEDULE VIEW
// ════════════════════════════════════════════════════════════════
export function ScheduleView({ upcomingAppointments, upcomingReminders, selectLead }) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="font-bold text-gray-900 text-lg">📅 Schedule</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Appointments</div>
        {upcomingAppointments.length === 0 && <div className="text-sm text-gray-400 mb-4">No appointments set</div>}
        {upcomingAppointments.map(lead => (
          <div key={lead.id} onClick={() => selectLead(lead)}
            className="mb-2 p-4 rounded-2xl border border-green-200 bg-green-50 active:bg-green-100 transition-colors">
            <div className="font-semibold text-gray-800 text-base">{lead.first_name} {lead.last_name}</div>
            <div className="text-sm text-green-700 font-medium mt-0.5">📅 {fmtDateTime(lead.appointment.appt_date, lead.appointment.appt_time)}</div>
            <div className="text-sm text-gray-500 mt-0.5">{lead.address}, {lead.city}</div>
            <div className="text-sm text-gray-500">{lead.phone}</div>
          </div>
        ))}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-5">Reminders</div>
        {upcomingReminders.length === 0 && <div className="text-sm text-gray-400">No reminders set</div>}
        {upcomingReminders.map(lead => (
          <div key={lead.id} onClick={() => selectLead(lead)}
            className="mb-2 p-4 rounded-2xl border border-amber-200 bg-amber-50 active:bg-amber-100 transition-colors">
            <div className="font-semibold text-gray-800 text-base">{lead.first_name} {lead.last_name}</div>
            <div className="text-sm text-amber-700 font-medium mt-0.5">⏰ {fmtDateTime(lead.reminder.reminder_date, lead.reminder.reminder_time)}</div>
            <div className="text-sm text-gray-500 mt-0.5">{lead.reminder.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ACTIVITY VIEW
// ════════════════════════════════════════════════════════════════
export function ActivityView({ todayStats, log }) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="font-bold text-gray-900 text-lg mb-2">📝 Today's Activity</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50 rounded-xl py-2">
            <div className="text-xl font-bold text-emerald-600">{todayStats.sold}</div>
            <div className="text-xs text-emerald-600">Sold</div>
          </div>
          <div className="bg-red-50 rounded-xl py-2">
            <div className="text-xl font-bold text-red-500">{todayStats.ni}</div>
            <div className="text-xs text-red-500">NI</div>
          </div>
          <div className="bg-blue-50 rounded-xl py-2">
            <div className="text-xl font-bold text-blue-500">{todayStats.nh}</div>
            <div className="text-xs text-blue-500">NH</div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-20">
        {log.length === 0 && <div className="text-center text-gray-400 text-sm py-10">No activity yet</div>}
        {log.map((entry, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-100 text-sm">
            <div className="font-semibold text-gray-800">{entry.name} {entry.num && <span className="text-gray-400 font-normal text-xs">#{entry.num}</span>}</div>
            <div className={`mt-0.5 ${entry.action.startsWith("SOLD") ? "text-emerald-600 font-semibold" : "text-blue-600"}`}>{entry.action}</div>
            {entry.move && <div className="text-purple-600 font-medium text-xs">{entry.move}</div>}
            {entry.alertMsg && <div className="text-red-500 leading-tight mt-0.5 text-xs">{entry.alertMsg}</div>}
            <div className="text-gray-400 mt-1 text-xs">{entry.time}</div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">NH Rules</div>
        <div className="text-xs text-gray-500 space-y-1">
          <div>☀️ AM lead until 3 AM NHs</div>
          <div>🌙 3 AM NHs → PM Only</div>
          <div>☀️ 3 PM NHs → AM Only</div>
          <div>⚰️ 3 AM + 3 PM → Aged Out</div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROUTE VIEW
// ════════════════════════════════════════════════════════════════
export function RouteView({ routeLeads, removeFromRoute, moveRouteItem, clearRoute, startRoute, onClose, selectLead, startAddress, setStartAddress, onOptimize, optimizing }) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-blue-600 font-medium text-base flex items-center gap-1 -ml-1 px-1 py-1">
            <span className="text-xl">‹</span> Back
          </button>
          <div className="font-bold text-gray-900 text-lg">🚗 My Route</div>
          <button onClick={clearRoute} className="text-red-500 text-sm font-medium px-1 py-1">Clear</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Starting point + optimize */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3 mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Starting Point (optional)</div>
          <input value={startAddress} onChange={e => setStartAddress(e.target.value)}
            placeholder="e.g. 123 Main St, Joliet, IL"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2" />
          <button onClick={onOptimize} disabled={optimizing || routeLeads.length < 2}
            className="w-full bg-indigo-600 disabled:opacity-40 text-white py-3 rounded-xl font-semibold text-sm active:bg-indigo-700">
            {optimizing ? "Optimizing…" : "🧭 Optimize Route Order"}
          </button>
        </div>

        {routeLeads.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">
            No stops in your route yet.<br />Go back and tap "+ Route" on leads.
          </div>
        ) : (
          <div className="space-y-2">
            {routeLeads.map((lead, idx) => (
              <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0" onClick={() => selectLead(lead)}>
                  <div className="font-semibold text-gray-800 text-sm truncate">{lead.first_name} {lead.last_name}</div>
                  <div className="text-xs text-gray-500 truncate">{lead.address}, {lead.city}, {lead.state}</div>
                  <div className="text-xs text-gray-400">{lead.phone}</div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => moveRouteItem(lead.id, -1)} disabled={idx === 0}
                    className="w-8 h-8 bg-gray-100 disabled:opacity-30 rounded-lg text-gray-600 active:bg-gray-200 flex items-center justify-center">▲</button>
                  <button onClick={() => moveRouteItem(lead.id, 1)} disabled={idx === routeLeads.length - 1}
                    className="w-8 h-8 bg-gray-100 disabled:opacity-30 rounded-lg text-gray-600 active:bg-gray-200 flex items-center justify-center">▼</button>
                </div>
                <button onClick={() => removeFromRoute(lead.id)}
                  className="flex-shrink-0 w-8 h-8 bg-red-50 text-red-500 rounded-lg active:bg-red-100 flex items-center justify-center text-sm">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {routeLeads.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white" style={{paddingBottom: "calc(1rem + env(safe-area-inset-bottom))"}}>
          <button onClick={() => startRoute(routeLeads)}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base active:bg-blue-700 flex items-center justify-center gap-2">
            🗺️ Start Route ({routeLeads.length} stop{routeLeads.length !== 1 ? "s" : ""})
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ADD LEAD MODAL
// ════════════════════════════════════════════════════════════════
export function AddLeadModal({ newLead, setNewLead, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div className="font-bold text-gray-900 text-lg">➕ Add Lead</div>
          <button onClick={onClose} className="text-gray-400 text-xl px-2">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input value={newLead.first_name} onChange={e => setNewLead(f => ({...f, first_name: e.target.value}))}
              placeholder="First name *"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={newLead.last_name} onChange={e => setNewLead(f => ({...f, last_name: e.target.value}))}
              placeholder="Last name *"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <input value={newLead.phone} onChange={e => setNewLead(f => ({...f, phone: e.target.value}))}
            placeholder="Phone (e.g. 773-555-1234)"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input value={newLead.address} onChange={e => setNewLead(f => ({...f, address: e.target.value}))}
            placeholder="Address"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex gap-2">
            <input value={newLead.city} onChange={e => setNewLead(f => ({...f, city: e.target.value}))}
              placeholder="City"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={newLead.state} onChange={e => setNewLead(f => ({...f, state: e.target.value}))}
              placeholder="St" maxLength={2}
              className="w-16 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <input value={newLead.lead_type} onChange={e => setNewLead(f => ({...f, lead_type: e.target.value}))}
            placeholder="Lead Type (e.g. Referral, Direct Mail)"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={onSave}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base active:bg-blue-700">
            Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// IMPORT CSV MODAL
// ════════════════════════════════════════════════════════════════
export function ImportModal({ importText, setImportText, importPreview, onPreview, onCommit, onClose }) {
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportText(ev.target.result);
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div className="font-bold text-gray-900 text-lg">📤 Import Leads (CSV)</div>
          <button onClick={onClose} className="text-gray-400 text-xl px-2">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-500">
            Upload a CSV file or paste CSV text. Expected columns: First, Last, Phone, Address, City, St, Lead Type, Notes (column names are flexible).
          </div>
          <input type="file" accept=".csv,text/csv" onChange={handleFile}
            className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:text-sm" />
          <textarea value={importText} onChange={e => setImportText(e.target.value)}
            placeholder="Or paste CSV text here…"
            rows={6}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={onPreview} disabled={!importText.trim()}
            className="w-full bg-gray-100 disabled:opacity-40 text-gray-700 py-2.5 rounded-xl font-semibold text-sm active:bg-gray-200">
            Preview
          </button>

          {importPreview && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                {importPreview.length} leads found — preview first 5:
              </div>
              <div className="max-h-40 overflow-y-auto">
                {importPreview.slice(0, 5).map((row, i) => (
                  <div key={i} className="px-3 py-2 border-t border-gray-100 text-xs text-gray-600">
                    {Object.entries(row).filter(([k,v]) => v).slice(0, 4).map(([k,v]) => `${k}: ${v}`).join(" · ")}
                  </div>
                ))}
              </div>
              <button onClick={onCommit}
                className="w-full bg-blue-600 text-white py-3 font-semibold text-base active:bg-blue-700">
                Import {importPreview.length} Leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PRODUCTION VIEW
// ════════════════════════════════════════════════════════════════

export function ProductionView({ allSales, goal, setGoal, selectLead }) {
  const [period, setPeriod] = useState("week");

  const filteredSales = useMemo(() => {
    const { start, end } = getDateRange(period);
    return allSales.filter(s => {
      const d = new Date(s.sold_date);
      return d >= start && d <= end;
    });
  }, [allSales, period]);

  const totalPremium = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + parsePremium(s.premium), 0);
  }, [filteredSales]);

  const carrierBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const carrier = s.carrier || "Unknown";
      const premium = parsePremium(s.premium);
      if (!map[carrier]) map[carrier] = { count: 0, premium: 0 };
      map[carrier].count += 1;
      map[carrier].premium += premium;
    });
    return Object.entries(map).sort((a, b) => b[1].premium - a[1].premium);
  }, [filteredSales]);

  const maxCarrierPremium = Math.max(1, ...carrierBreakdown.map(([, v]) => v.premium));

  const goalProgress = goal > 0 ? Math.min(100, (totalPremium / goal) * 100) : 0;

  const periods = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="font-bold text-gray-900 text-lg mb-2">📈 Production</div>
        <div className="flex gap-1.5 flex-wrap">
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${period === p.key ? "bg-slate-700 text-white border-slate-700" : "bg-white text-gray-500 border-gray-300"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-3">
        {/* Totals */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-emerald-600">${totalPremium.toFixed(2)}</div>
              <div className="text-xs text-emerald-600 mt-0.5">Monthly Premium</div>
            </div>
            <div className="bg-blue-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-blue-600">{filteredSales.length}</div>
              <div className="text-xs text-blue-600 mt-0.5">Policies</div>
            </div>
          </div>
        </div>

        {/* Goal Tracker */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-gray-700 text-sm">🎯 Weekly Goal</div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">$</span>
              <input
                type="number"
                value={goal}
                onChange={e => setGoal(Number(e.target.value) || 0)}
                className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-xs text-gray-400">/mo</span>
            </div>
          </div>
          {goal > 0 ? (
            <>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-3 rounded-full transition-all"
                  style={{ width: `${goalProgress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                <span>${totalPremium.toFixed(2)} of ${goal.toFixed(2)}</span>
                <span>{goalProgress.toFixed(0)}%</span>
              </div>
              {period !== "week" && (
                <div className="text-xs text-amber-500 mt-1">Goal compares to "This Week" data — switch period to see progress accurately</div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-400">Set a weekly premium goal to track progress</div>
          )}
        </div>

        {/* Carrier Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="font-semibold text-gray-700 text-sm mb-3">Carrier Breakdown</div>
          {carrierBreakdown.length === 0 ? (
            <div className="text-xs text-gray-400">No sales in this period</div>
          ) : (
            <div className="space-y-2.5">
              {carrierBreakdown.map(([carrier, v]) => (
                <div key={carrier}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{carrier}</span>
                    <span className="text-gray-500">{v.count} policy{v.count !== 1 ? "ies" : ""} · ${v.premium.toFixed(2)}/mo</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(v.premium / maxCarrierPremium) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales list */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-gray-700 text-sm">Policies</div>
            <button onClick={() => exportSalesCSV(filteredSales)} disabled={filteredSales.length === 0}
              className="text-xs bg-gray-100 disabled:opacity-40 text-gray-600 px-3 py-1.5 rounded-lg font-medium active:bg-gray-200">
              📥 Export CSV
            </button>
          </div>
          {filteredSales.length === 0 ? (
            <div className="text-xs text-gray-400">No policies sold in this period</div>
          ) : (
            <div className="space-y-2">
              {filteredSales.map(s => (
                <div key={s.id} onClick={() => s.lead && selectLead(s.lead)}
                  className="border border-gray-100 rounded-xl p-3 active:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-800 text-sm">{s.lead ? `${s.lead.first_name} ${s.lead.last_name}` : "Unknown lead"}</div>
                    <div className="text-emerald-600 font-semibold text-sm">{s.premium}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.carrier} · {s.coverage}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{new Date(s.sold_date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
