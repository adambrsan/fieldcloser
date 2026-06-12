// ── NH Rules Engine ──────────────────────────────────────────────
export function applyNHRules(am, pm, currentStatus) {
  let newStatus = currentStatus;
  let moveToSheet = null;
  let alert = null;

  if (am >= 3 && pm >= 3) {
    newStatus = "Aged Out";
    moveToSheet = "Aged Leads";
    alert = { type: "aged", msg: "AGED OUT — 3 AM + 3 PM NHs. Move to Aged Leads." };
  } else if (am >= 3 && pm < 3) {
    if (currentStatus !== "PM Only" && currentStatus !== "Aged Out") {
      newStatus = "PM Only";
      moveToSheet = "After 5pm-Weekends";
      alert = { type: "pm", msg: "PM ONLY — 3 AM NHs reached. Move to After 5pm-Weekends." };
    }
  } else if (pm >= 3 && am < 3) {
    if (currentStatus !== "AM Only" && currentStatus !== "Aged Out") {
      newStatus = "AM Only";
      moveToSheet = "AM Only";
      alert = { type: "am", msg: "AM ONLY — 3 PM NHs reached. Move to AM Only." };
    }
  }

  if (!alert) {
    if (am === 2 && pm < 3) alert = { type: "warn", msg: "WARNING: 1 more AM NH → PM Only" };
    else if (pm === 2 && am < 3) alert = { type: "warn", msg: "WARNING: 1 more PM NH → AM Only" };
  }

  return { newStatus, moveToSheet, alert };
}

export const CARRIERS = ["American Amicable","CICA","Senior Life","Catholic Financial Life","Polish Falcons","Trinity Life","Royal Arcanum","Other"];

// ── ICS Calendar File Generator ──────────────────────────────────
export function downloadICS({ title, description, location, start, end }) {
  const fmt = (d) => {
    const dt = new Date(d);
    return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FieldCloser//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@fieldcloser`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV Export ────────────────────────────────────────────────────
const EXPORT_COLUMNS = ["lead_num","first_name","last_name","phone","address","city","state","status","am_nh","pm_nh","follow_up_date","lead_type","sheet_name","notes"];
const EXPORT_HEADERS = ["#","First","Last","Phone","Address","City","St","Status","AM NH","PM NH","Follow-Up","Lead Type","Sheet","Notes"];

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportLeadsCSV(leads) {
  const header = EXPORT_HEADERS.join(",");
  const rows = leads.map(l => {
    const notesCombined = (l.notesList || []).map(n => n.created_at ? `[${new Date(n.created_at).toLocaleString()}] ${n.text}` : n.text).join(" | ");
    return EXPORT_COLUMNS.map(col => {
      if (col === "notes") return csvEscape(notesCombined);
      return csvEscape(l[col]);
    }).join(",");
  });
  const csv = [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().split("T")[0];
  a.download = `FieldCloser_Leads_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV Import (simple parser, handles quoted fields) ─────────────
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i+1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && next === '\n') i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(c => c.trim() !== "")).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] || "").trim(); });
    return obj;
  });
}

export function StatusBadge({ status }) {
  const map = {
    "AM/PM": "bg-blue-100 text-blue-800",
    "Follow-Up": "bg-yellow-100 text-yellow-800",
    "Appointment": "bg-green-100 text-green-800",
    "PM Only": "bg-purple-100 text-purple-800",
    "AM Only": "bg-orange-100 text-orange-800",
    "Aged Out": "bg-gray-200 text-gray-500",
    "NI": "bg-red-100 text-red-700",
    "Sold": "bg-emerald-100 text-emerald-800",
    "Medicare FU": "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export function NHDots({ count }) {
  return (
    <div className="flex gap-1">
      {[0,1,2].map(i => (
        <div key={i} className={`w-4 h-4 rounded-sm border ${i < count
          ? count >= 3 ? "bg-red-400 border-red-500" : count === 2 ? "bg-yellow-400 border-yellow-500" : "bg-blue-400 border-blue-400"
          : "bg-gray-100 border-gray-300"}`} />
      ))}
    </div>
  );
}

export function fmtDateTime(dateStr, timeStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T${timeStr || "09:00"}`);
  return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function digitsOnly(phone) {
  return (phone || "").replace(/\D/g, "");
}

// ── Geocoding via Nominatim (OpenStreetMap, free, no API key) ────
const geocodeCache = new Map();

export async function geocodeAddress(address) {
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(address, coords);
      return coords;
    }
  } catch (e) {
    console.error("Geocode error for", address, e);
  }
  geocodeCache.set(address, null);
  return null;
}

function haversineDistance(a, b) {
  const R = 3958.8; // miles
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

// Nearest-neighbor route optimization.
// stops: array of { id, address, coords }
// startCoords: { lat, lng } or null
// Returns optimized array of ids in visiting order.
export function optimizeRouteOrder(stops, startCoords) {
  const remaining = stops.filter(s => s.coords).map(s => ({ ...s }));
  const unlocatable = stops.filter(s => !s.coords).map(s => s.id);
  const ordered = [];

  let current = startCoords;
  while (remaining.length > 0) {
    let bestIdx = 0;
    if (current) {
      let bestDist = Infinity;
      remaining.forEach((s, i) => {
        const d = haversineDistance(current, s.coords);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next.id);
    current = next.coords;
  }

  return [...ordered, ...unlocatable];
}

