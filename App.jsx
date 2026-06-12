import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient.js";
import {
  applyNHRules, downloadICS, exportLeadsCSV, parseCSV,
  fmtDateTime, geocodeAddress, optimizeRouteOrder, haversineMiles
} from "./helpers.jsx";
import LeadDetail from "./LeadDetail.jsx";
import LeadList from "./LeadList.jsx";
import { ScheduleView, ActivityView, RouteView, AddLeadModal, ImportModal, ProductionView, MileageView } from "./Views.jsx";

export default function App() {
  const [leads, setLeads] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetFilter, setSheetFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tab, setTab] = useState("leads");
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [nhPreview, setNhPreview] = useState(null);
  const [dispMode, setDispMode] = useState(null);
  const [customStatus, setCustomStatus] = useState("");
  const [noteText, setNoteText] = useState("");
  const [fuDate, setFuDate] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("10:00");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderText, setReminderText] = useState("");
  const [soldForm, setSoldForm] = useState({ carrier: "", coverage: "", premium: "" });
  const [log, setLog] = useState([]);
  const [toast, setToast] = useState(null);
  const [routeIds, setRouteIds] = useState([]);
  const [showRoute, setShowRoute] = useState(false);
  const [startAddress, setStartAddress] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    const saved = localStorage.getItem("fieldcloser_goal");
    return saved ? Number(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem("fieldcloser_goal", String(weeklyGoal));
  }, [weeklyGoal]);

  // ── Mileage state ─────────────────────────────────────────────
  const [trips, setTrips] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [trackedMiles, setTrackedMiles] = useState(0);
  const [manualMiles, setManualMiles] = useState("");
  const [manualPurpose, setManualPurpose] = useState("");
  const [gpsError, setGpsError] = useState("");
  const watchIdRef = useState({ current: null })[0];
  const lastPosRef = useState({ current: null })[0];
  const tripStartRef = useState({ current: null })[0];

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    const { data, error } = await supabase.from("trips").select("*").order("trip_date", { ascending: false }).order("created_at", { ascending: false });
    if (!error) setTrips(data || []);
  }

  function onStartTrip() {
    if (!navigator.geolocation) {
      setGpsError("GPS not available on this device/browser");
      return;
    }
    setGpsError("");
    setTrackedMiles(0);
    lastPosRef.current = null;
    tripStartRef.current = new Date();
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const current = { lat: latitude, lng: longitude };
        if (lastPosRef.current) {
          const d = haversineMiles(lastPosRef.current, current);
          // Ignore GPS jitter under ~0.01 miles (~16m)
          if (d > 0.01) {
            setTrackedMiles(prev => prev + d);
            lastPosRef.current = current;
          }
        } else {
          lastPosRef.current = current;
        }
      },
      (err) => {
        setGpsError("GPS error: " + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  async function onStopTrip() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    if (trackedMiles < 0.05) {
      showToast("Trip too short to save");
      setTrackedMiles(0);
      return;
    }
    const { data, error } = await supabase.from("trips").insert({
      trip_date: new Date().toISOString().split("T")[0],
      miles: Math.round(trackedMiles * 100) / 100,
      purpose: "Field route",
      source: "gps",
      started_at: tripStartRef.current?.toISOString(),
      ended_at: new Date().toISOString(),
    }).select().single();
    if (error) { showToast("Error saving trip"); return; }
    setTrips(prev => [data, ...prev]);
    pushLog({ name: "Trip logged", num: "", action: `🚙 ${data.miles} mi (GPS)` });
    showToast(`Trip saved — ${data.miles} miles`);
    setTrackedMiles(0);
  }

  async function onAddManualTrip() {
    const miles = parseFloat(manualMiles);
    if (!miles || miles <= 0) return;
    const { data, error } = await supabase.from("trips").insert({
      trip_date: new Date().toISOString().split("T")[0],
      miles: Math.round(miles * 100) / 100,
      purpose: manualPurpose || "Manual entry",
      source: "manual",
    }).select().single();
    if (error) { showToast("Error saving trip"); return; }
    setTrips(prev => [data, ...prev]);
    pushLog({ name: "Trip logged", num: "", action: `🚙 ${data.miles} mi (manual)` });
    showToast(`Trip saved — ${data.miles} miles`);
    setManualMiles("");
    setManualPurpose("");
  }

  async function onDeleteTrip(id) {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) { showToast("Error deleting trip"); return; }
    setTrips(prev => prev.filter(t => t.id !== id));
  }

  const [showAddLead, setShowAddLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newLead, setNewLead] = useState({ first_name: "", last_name: "", phone: "", address: "", city: "", state: "IL", lead_type: "Manual" });
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState(null);

  const sheets = ["All", "Active Leads", "64+ Leads", "New Leads"];
  const statuses = ["All", "AM/PM", "Follow-Up", "Appointment", "PM Only", "AM Only", "Aged Out", "NI", "Sold", "Medicare FU"];

  useEffect(() => {
    loadLeads();
    loadRelated();
  }, []);

  async function loadLeads() {
    setLoading(true);
    const pageSize = 1000;
    let allRows = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("lead_num", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error(error);
        showToast("Error loading leads: " + error.message);
        break;
      }
      allRows = allRows.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setLeads(allRows.map(l => ({ ...l, notesList: [], appointment: null, reminder: null, sold: null })));
    setLoading(false);
  }

  async function loadRelated() {
    const [notesRes, apptRes, remRes, salesRes] = await Promise.all([
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      supabase.from("appointments").select("*"),
      supabase.from("reminders").select("*"),
      supabase.from("sales").select("*").order("sold_date", { ascending: false }),
    ]);

    setLeads(prev => {
      const updated = prev.map(lead => {
        const notesList = (notesRes.data || []).filter(n => n.lead_id === lead.id);
        const appointment = (apptRes.data || []).find(a => a.lead_id === lead.id) || null;
        const reminder = (remRes.data || []).find(r => r.lead_id === lead.id) || null;
        const sold = (salesRes.data || []).find(s => s.lead_id === lead.id) || null;
        return { ...lead, notesList, appointment, reminder, sold };
      });

      // Build allSales with lead reference attached
      const leadById = new Map(updated.map(l => [l.id, l]));
      const salesWithLead = (salesRes.data || []).map(s => ({ ...s, lead: leadById.get(s.lead_id) || null }));
      setAllSales(salesWithLead);

      return updated;
    });
  }

  const filtered = useMemo(() => {
    let res = leads;
    if (sheetFilter !== "All") res = res.filter(l => l.sheet_name === sheetFilter);
    if (statusFilter !== "All") res = res.filter(l => l.status === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      res = res.filter(l =>
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(s) ||
        String(l.lead_num).includes(s) ||
        (l.address || "").toLowerCase().includes(s) ||
        (l.city || "").toLowerCase().includes(s) ||
        (l.phone || "").includes(s)
      );
    }
    return res.slice(0, 100);
  }, [leads, search, sheetFilter, statusFilter]);

  const upcomingAppointments = useMemo(() => {
    return leads
      .filter(l => l.appointment)
      .sort((a, b) => new Date(`${a.appointment.appt_date}T${a.appointment.appt_time}`) - new Date(`${b.appointment.appt_date}T${b.appointment.appt_time}`));
  }, [leads]);

  const upcomingReminders = useMemo(() => {
    return leads
      .filter(l => l.reminder)
      .sort((a, b) => new Date(`${a.reminder.reminder_date}T${a.reminder.reminder_time}`) - new Date(`${b.reminder.reminder_date}T${b.reminder.reminder_time}`));
  }, [leads]);

  const routeLeads = useMemo(() => {
    return routeIds.map(id => leads.find(l => l.id === id)).filter(Boolean);
  }, [routeIds, leads]);

  const totalBySheet = useMemo(() => {
    const counts = {};
    leads.forEach(l => { counts[l.sheet_name] = (counts[l.sheet_name] || 0) + 1; });
    return counts;
  }, [leads]);

  const todayStats = useMemo(() => {
    const sold = log.filter(l => l.action.startsWith("SOLD")).length;
    const ni = log.filter(l => l.action === "Not Interested").length;
    const nh = log.filter(l => l.action.startsWith("NH")).length;
    return { sold, ni, nh, total: log.length };
  }, [log]);

  const scheduleCount = upcomingAppointments.length + upcomingReminders.length;

  function selectLead(lead) {
    setSelected(lead);
    setShowRoute(false);
    setNhPreview(null);
    setDispMode(null);
    setCustomStatus("");
    setNoteText("");
    setFuDate(lead.follow_up_date || "");
    setApptDate(lead.appointment?.appt_date || "");
    setApptTime(lead.appointment?.appt_time?.slice(0,5) || "10:00");
    setReminderDate(lead.reminder?.reminder_date || "");
    setReminderTime(lead.reminder?.reminder_time?.slice(0,5) || "09:00");
    setReminderText(lead.reminder?.text || "");
    setSoldForm({ carrier: "", coverage: "", premium: "" });
  }

  function backToList() {
    setSelected(null);
    setDispMode(null);
    setNhPreview(null);
  }

  function previewNH(type) {
    if (!selected) return;
    const am = type === "NH_AM" ? selected.am_nh + 1 : selected.am_nh;
    const pm = type === "NH_PM" ? selected.pm_nh + 1 : selected.pm_nh;
    const result = applyNHRules(am, pm, selected.status);
    setNhPreview({ type, am, pm, ...result });
    setDispMode(type);
  }

  function pushLog(entry) {
    setLog(prev => [{ ...entry, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 60));
  }

  async function logActivity(lead, action, moveNote, alertMsg) {
    await supabase.from("activity_log").insert({
      lead_id: lead?.id || null,
      lead_name: lead ? `${lead.first_name} ${lead.last_name}` : null,
      lead_num: lead ? String(lead.lead_num) : null,
      action,
      move_note: moveNote || null,
      alert_msg: alertMsg || null,
    });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function updateLeadLocal(updated) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelected(updated);
  }

  async function commitNH(type) {
    if (!selected || !nhPreview) return;
    const now = new Date();
    const period = type === "NH_AM" ? "AM" : "PM";
    const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const dateStr = now.toLocaleDateString([], { month: "numeric", day: "numeric" });
    const noteTextStr = `NH ${timeStr} ${dateStr} (${period})`;

    const { error: updErr } = await supabase.from("leads").update({
      am_nh: nhPreview.am,
      pm_nh: nhPreview.pm,
      status: nhPreview.newStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", selected.id);

    const { data: noteData, error: noteErr } = await supabase.from("notes").insert({
      lead_id: selected.id,
      text: noteTextStr,
    }).select().single();

    if (updErr || noteErr) {
      showToast("Error saving — check connection");
      console.error(updErr, noteErr);
      return;
    }

    const updated = {
      ...selected,
      am_nh: nhPreview.am,
      pm_nh: nhPreview.pm,
      status: nhPreview.newStatus,
      notesList: [noteData, ...(selected.notesList || [])],
    };
    updateLeadLocal(updated);

    const action = type === "NH_AM" ? `NH (AM) — count ${nhPreview.am}` : `NH (PM) — count ${nhPreview.pm}`;
    const move = nhPreview.moveToSheet ? `→ Move to ${nhPreview.moveToSheet}` : null;
    const alertMsg = nhPreview.alert ? nhPreview.alert.msg : null;
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action, move, alertMsg });
    logActivity(selected, action, move, alertMsg);
    setDispMode(null);
    setNhPreview(null);
    showToast(move ? `${action} · ${move}` : action);
  }

  async function commitNI() {
    if (!selected) return;
    const { error } = await supabase.from("leads").update({ status: "NI", updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) { showToast("Error saving"); return; }
    updateLeadLocal({ ...selected, status: "NI" });
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action: "Not Interested" });
    logActivity(selected, "Not Interested");
    showToast("Marked Not Interested");
  }

  async function commitCustomStatus() {
    if (!selected || !customStatus) return;
    const { error } = await supabase.from("leads").update({ status: customStatus, updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) { showToast("Error saving"); return; }
    updateLeadLocal({ ...selected, status: customStatus });
    const action = `Status → ${customStatus}`;
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action });
    logActivity(selected, action);
    setDispMode(null);
    setCustomStatus("");
    showToast(`Status set to ${customStatus}`);
  }

  async function commitNote() {
    if (!selected || !noteText.trim()) return;
    const { data, error } = await supabase.from("notes").insert({
      lead_id: selected.id,
      text: noteText,
    }).select().single();
    if (error) { showToast("Error saving note"); return; }
    updateLeadLocal({ ...selected, notesList: [data, ...(selected.notesList || [])] });
    const action = `Note added: "${noteText.slice(0,40)}${noteText.length>40?"…":""}"`;
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action });
    logActivity(selected, action);
    setNoteText("");
    showToast("Note saved");
  }

  async function deleteNote(noteId) {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) { showToast("Error deleting note"); return; }
    updateLeadLocal({ ...selected, notesList: (selected.notesList || []).filter(n => n.id !== noteId) });
  }

  async function commitFU() {
    if (!selected || !fuDate) return;
    const { error } = await supabase.from("leads").update({ status: "Follow-Up", follow_up_date: fuDate, updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) { showToast("Error saving"); return; }
    updateLeadLocal({ ...selected, status: "Follow-Up", follow_up_date: fuDate });
    const action = `Follow-Up set: ${fuDate}`;
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action });
    logActivity(selected, action);
    setDispMode(null);
    showToast(`Follow-up set for ${fuDate}`);
  }

  async function commitSold() {
    if (!selected || !soldForm.carrier || !soldForm.premium) return;
    const { data, error: saleErr } = await supabase.from("sales").insert({
      lead_id: selected.id,
      carrier: soldForm.carrier,
      coverage: soldForm.coverage,
      premium: soldForm.premium,
    }).select().single();
    const { error: updErr } = await supabase.from("leads").update({ status: "Sold", updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (saleErr || updErr) { showToast("Error saving sale"); return; }
    updateLeadLocal({ ...selected, status: "Sold", sold: data });
    setAllSales(prev => [{ ...data, lead: { ...selected, status: "Sold" } }, ...prev]);
    const action = `SOLD — ${soldForm.carrier} ${soldForm.coverage} @ ${soldForm.premium}`;
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action });
    logActivity(selected, action);
    setDispMode(null);
    setSoldForm({ carrier: "", coverage: "", premium: "" });
    showToast("🎉 Marked as Sold!");
  }

  async function commitAppointment() {
    if (!selected || !apptDate) return;
    await supabase.from("appointments").delete().eq("lead_id", selected.id);
    const { data, error } = await supabase.from("appointments").insert({
      lead_id: selected.id,
      appt_date: apptDate,
      appt_time: apptTime,
    }).select().single();
    const { error: updErr } = await supabase.from("leads").update({ status: "Appointment", updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error || updErr) { showToast("Error saving appointment"); return; }
    updateLeadLocal({ ...selected, status: "Appointment", appointment: data });
    const action = `Appointment set: ${fmtDateTime(apptDate, apptTime)}`;
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action });
    logActivity(selected, action);
    showToast(action);
  }

  function addApptToCalendar(lead) {
    const appt = lead.appointment;
    if (!appt) return;
    const start = new Date(`${appt.appt_date}T${appt.appt_time}`);
    const end = new Date(start.getTime() + 30 * 60000);
    downloadICS({
      title: `Appt: ${lead.first_name} ${lead.last_name}`,
      description: `Name: ${lead.first_name} ${lead.last_name}\nAddress: ${lead.address}, ${lead.city}, ${lead.state}\nPhone: ${lead.phone}\nLead Type: ${lead.lead_type || ""}`,
      location: `${lead.address}, ${lead.city}, ${lead.state}`,
      start, end
    });
    pushLog({ name: `${lead.first_name} ${lead.last_name}`, num: lead.lead_num, action: "📥 Calendar event downloaded (Appointment)" });
    showToast("Calendar file downloaded — tap to add to your calendar");
  }

  async function clearAppointment() {
    if (!selected) return;
    await supabase.from("appointments").delete().eq("lead_id", selected.id);
    updateLeadLocal({ ...selected, appointment: null });
    setApptDate("");
    showToast("Appointment cleared");
  }

  async function commitReminder() {
    if (!selected || !reminderDate) return;
    await supabase.from("reminders").delete().eq("lead_id", selected.id);
    const { data, error } = await supabase.from("reminders").insert({
      lead_id: selected.id,
      reminder_date: reminderDate,
      reminder_time: reminderTime,
      text: reminderText || "Follow up",
    }).select().single();
    if (error) { showToast("Error saving reminder"); return; }
    updateLeadLocal({ ...selected, reminder: data });
    const action = `Reminder set: ${fmtDateTime(reminderDate, reminderTime)}`;
    pushLog({ name: `${selected.first_name} ${selected.last_name}`, num: selected.lead_num, action });
    logActivity(selected, action);
    showToast(action);
  }

  function addReminderToCalendar(lead) {
    const rem = lead.reminder;
    if (!rem) return;
    const start = new Date(`${rem.reminder_date}T${rem.reminder_time}`);
    const end = new Date(start.getTime() + 15 * 60000);
    downloadICS({
      title: `Reminder: ${lead.first_name} ${lead.last_name} — ${rem.text}`,
      description: `Name: ${lead.first_name} ${lead.last_name}\nAddress: ${lead.address}, ${lead.city}, ${lead.state}\nPhone: ${lead.phone}\nNote: ${rem.text}`,
      location: `${lead.address}, ${lead.city}, ${lead.state}`,
      start, end
    });
    pushLog({ name: `${lead.first_name} ${lead.last_name}`, num: lead.lead_num, action: "📥 Calendar event downloaded (Reminder)" });
    showToast("Calendar file downloaded — tap to add to your calendar");
  }

  async function clearReminder() {
    if (!selected) return;
    await supabase.from("reminders").delete().eq("lead_id", selected.id);
    updateLeadLocal({ ...selected, reminder: null });
    setReminderDate("");
    setReminderText("");
    showToast("Reminder cleared");
  }

  function toggleRoute(lead) {
    setRouteIds(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]);
  }
  function removeFromRoute(id) {
    setRouteIds(prev => prev.filter(rid => rid !== id));
  }
  function moveRouteItem(id, direction) {
    setRouteIds(prev => {
      const idx = prev.indexOf(id);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }
  function clearRoute() {
    setRouteIds([]);
    setShowRoute(false);
    setStartAddress("");
  }

  async function optimizeRoute() {
    if (routeLeads.length < 2) return;
    setOptimizing(true);
    try {
      // Geocode all stops
      const stopsWithCoords = await Promise.all(routeLeads.map(async (l) => ({
        id: l.id,
        address: `${l.address}, ${l.city}, ${l.state}`,
        coords: await geocodeAddress(`${l.address}, ${l.city}, ${l.state}`),
      })));

      let startCoords = null;
      if (startAddress.trim()) {
        startCoords = await geocodeAddress(startAddress.trim());
        if (!startCoords) {
          showToast("Could not locate starting address — optimizing without it");
        }
      }

      const failedCount = stopsWithCoords.filter(s => !s.coords).length;
      const orderedIds = optimizeRouteOrder(stopsWithCoords, startCoords);
      setRouteIds(orderedIds);

      if (failedCount > 0) {
        showToast(`Route optimized — ${failedCount} address${failedCount > 1 ? "es" : ""} couldn't be located and were left at the end`);
      } else {
        showToast("Route optimized by distance ✓");
      }
    } catch (e) {
      console.error(e);
      showToast("Error optimizing route");
    } finally {
      setOptimizing(false);
    }
  }

  function startRoute(routeLeadsArg) {
    if (routeLeadsArg.length === 0) return;
    const addresses = routeLeadsArg.map(l => `${l.address}, ${l.city}, ${l.state}`);
    const origin = startAddress.trim();
    if (addresses.length === 1) {
      const url = origin
        ? `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(addresses[0])}`
        : `https://maps.apple.com/?daddr=${encodeURIComponent(addresses[0])}`;
      window.open(url, "_blank");
    } else {
      const destination = addresses[addresses.length - 1];
      const waypoints = addresses.slice(0, -1).map(a => encodeURIComponent(a)).join("+to:");
      const daddr = `${waypoints}+to:${encodeURIComponent(destination)}`;
      const url = origin
        ? `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${daddr}&dirflg=d`
        : `https://maps.apple.com/?daddr=${daddr}&dirflg=d`;
      window.open(url, "_blank");
    }
    pushLog({ name: `Route (${routeLeadsArg.length} stops)`, num: "", action: `🚗 Route started — ${routeLeadsArg.length} stops` });
    showToast(`Opening route with ${routeLeadsArg.length} stops in Maps`);
  }

  async function commitAddLead() {
    if (!newLead.first_name.trim() || !newLead.last_name.trim()) {
      showToast("First and last name required");
      return;
    }
    const maxNum = Math.max(0, ...leads.map(l => Number(l.lead_num) || 0));
    const insertData = {
      lead_num: maxNum + 1,
      first_name: newLead.first_name.trim(),
      last_name: newLead.last_name.trim(),
      phone: newLead.phone.trim(),
      address: newLead.address.trim(),
      city: newLead.city.trim(),
      state: newLead.state.trim() || "IL",
      status: "AM/PM",
      am_nh: 0,
      pm_nh: 0,
      lead_type: newLead.lead_type || "Manual",
      sheet_name: "New Leads",
    };
    const { data, error } = await supabase.from("leads").insert(insertData).select().single();
    if (error) { showToast("Error adding lead: " + error.message); return; }
    setLeads(prev => [{ ...data, notesList: [], appointment: null, reminder: null, sold: null }, ...prev]);
    const action = "➕ Lead added manually";
    pushLog({ name: `${data.first_name} ${data.last_name}`, num: data.lead_num, action });
    logActivity(data, action);
    setNewLead({ first_name: "", last_name: "", phone: "", address: "", city: "", state: "IL", lead_type: "Manual" });
    setShowAddLead(false);
    showToast(`${data.first_name} ${data.last_name} added — #${data.lead_num}`);
  }

  function previewImport() {
    if (!importText.trim()) return;
    try {
      const rows = parseCSV(importText);
      if (rows.length === 0) {
        showToast("No rows found — check your CSV format");
        return;
      }
      setImportPreview(rows);
    } catch (e) {
      showToast("Could not parse CSV");
    }
  }

  async function commitImport() {
    if (!importPreview || importPreview.length === 0) return;
    let maxNum = Math.max(0, ...leads.map(l => Number(l.lead_num) || 0));
    const get = (row, ...keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase());
        if (found && row[found]) return row[found];
      }
      return "";
    };
    const inserts = importPreview.map(row => {
      maxNum += 1;
      return {
        lead_num: maxNum,
        first_name: get(row, "First", "First Name", "FirstName"),
        last_name: get(row, "Last", "Last Name", "LastName"),
        phone: get(row, "Phone", "Phone Number"),
        address: get(row, "Address", "Street", "Street Address"),
        city: get(row, "City"),
        state: get(row, "St", "State") || "IL",
        status: get(row, "Status") || "AM/PM",
        am_nh: Number(get(row, "AM NH")) || 0,
        pm_nh: Number(get(row, "PM NH")) || 0,
        lead_type: get(row, "Lead Type", "LeadType") || "Imported",
        sheet_name: "New Leads",
      };
    }).filter(l => l.first_name || l.last_name);

    const { data, error } = await supabase.from("leads").insert(inserts).select();
    if (error) { showToast("Import error: " + error.message); return; }

    setLeads(prev => [...data.map(d => ({ ...d, notesList: [], appointment: null, reminder: null, sold: null })), ...prev]);
    const action = `➕ Imported ${data.length} leads`;
    pushLog({ name: `CSV Import`, num: "", action });
    logActivity(null, action);
    setImportText("");
    setImportPreview(null);
    setShowImport(false);
    showToast(`Imported ${data.length} leads`);
  }

  return (
    <div className="h-screen w-full bg-gray-50 text-sm font-sans flex flex-col overflow-hidden" style={{maxWidth: "100vw"}}>
      <div className="flex-1 overflow-hidden relative">
        {selected ? (
          <LeadDetail
            selected={selected}
            nhPreview={nhPreview}
            dispMode={dispMode}
            customStatus={customStatus} setCustomStatus={setCustomStatus}
            noteText={noteText} setNoteText={setNoteText}
            fuDate={fuDate} setFuDate={setFuDate}
            apptDate={apptDate} setApptDate={setApptDate}
            apptTime={apptTime} setApptTime={setApptTime}
            reminderDate={reminderDate} setReminderDate={setReminderDate}
            reminderTime={reminderTime} setReminderTime={setReminderTime}
            reminderText={reminderText} setReminderText={setReminderText}
            soldForm={soldForm} setSoldForm={setSoldForm}
            backToList={backToList}
            previewNH={previewNH}
            commitNH={commitNH}
            commitNI={commitNI}
            commitCustomStatus={commitCustomStatus}
            commitNote={commitNote}
            deleteNote={deleteNote}
            commitFU={commitFU}
            commitSold={commitSold}
            commitAppointment={commitAppointment}
            addApptToCalendar={addApptToCalendar}
            clearAppointment={clearAppointment}
            commitReminder={commitReminder}
            addReminderToCalendar={addReminderToCalendar}
            clearReminder={clearReminder}
            setDispMode={setDispMode}
            setNhPreview={setNhPreview}
          />
        ) : showRoute ? (
          <RouteView
            routeLeads={routeLeads}
            removeFromRoute={removeFromRoute}
            moveRouteItem={moveRouteItem}
            clearRoute={clearRoute}
            startRoute={startRoute}
            onClose={() => setShowRoute(false)}
            selectLead={selectLead}
            startAddress={startAddress}
            setStartAddress={setStartAddress}
            onOptimize={optimizeRoute}
            optimizing={optimizing}
          />
        ) : tab === "leads" ? (
          <LeadList
            leads={leads}
            filtered={filtered}
            search={search} setSearch={setSearch}
            showFilters={showFilters} setShowFilters={setShowFilters}
            sheets={sheets} sheetFilter={sheetFilter} setSheetFilter={setSheetFilter}
            statuses={statuses} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            totalBySheet={totalBySheet}
            selectLead={selectLead}
            routeIds={routeIds}
            toggleRoute={toggleRoute}
            onOpenRoute={() => setShowRoute(true)}
            onAddLead={() => setShowAddLead(true)}
            onImport={() => setShowImport(true)}
            onExport={() => exportLeadsCSV(leads)}
            loading={loading}
          />
        ) : tab === "schedule" ? (
          <ScheduleView
            upcomingAppointments={upcomingAppointments}
            upcomingReminders={upcomingReminders}
            selectLead={selectLead}
          />
        ) : tab === "production" ? (
          <ProductionView
            allSales={allSales}
            goal={weeklyGoal}
            setGoal={setWeeklyGoal}
            selectLead={selectLead}
          />
        ) : tab === "mileage" ? (
          <MileageView
            trips={trips}
            tracking={tracking}
            trackedMiles={trackedMiles}
            onStartTrip={onStartTrip}
            onStopTrip={onStopTrip}
            manualMiles={manualMiles} setManualMiles={setManualMiles}
            manualPurpose={manualPurpose} setManualPurpose={setManualPurpose}
            onAddManual={onAddManualTrip}
            onDeleteTrip={onDeleteTrip}
            gpsError={gpsError}
          />
        ) : (
          <ActivityView todayStats={todayStats} log={log} />
        )}
      </div>

      {!selected && !showRoute && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white flex" style={{paddingBottom: "env(safe-area-inset-bottom)"}}>
          <button onClick={() => setTab("leads")}
            className={`flex-1 flex flex-col items-center py-2 ${tab === "leads" ? "text-slate-800" : "text-gray-400"}`}>
            <span className="text-lg">📋</span>
            <span className="text-[10px] font-medium mt-0.5">Leads</span>
          </button>
          <button onClick={() => setTab("schedule")}
            className={`flex-1 flex flex-col items-center py-2 relative ${tab === "schedule" ? "text-slate-800" : "text-gray-400"}`}>
            <span className="text-lg">📅</span>
            <span className="text-[10px] font-medium mt-0.5">Schedule</span>
            {scheduleCount > 0 && (
              <span className="absolute top-0.5 right-[20%] bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{scheduleCount}</span>
            )}
          </button>
          <button onClick={() => setTab("activity")}
            className={`flex-1 flex flex-col items-center py-2 ${tab === "activity" ? "text-slate-800" : "text-gray-400"}`}>
            <span className="text-lg">📊</span>
            <span className="text-[10px] font-medium mt-0.5">Activity</span>
          </button>
          <button onClick={() => setTab("production")}
            className={`flex-1 flex flex-col items-center py-2 ${tab === "production" ? "text-slate-800" : "text-gray-400"}`}>
            <span className="text-lg">📈</span>
            <span className="text-[10px] font-medium mt-0.5">Production</span>
          </button>
          <button onClick={() => setTab("mileage")}
            className={`flex-1 flex flex-col items-center py-2 relative ${tab === "mileage" ? "text-slate-800" : "text-gray-400"}`}>
            <span className="text-lg">🚙</span>
            <span className="text-[10px] font-medium mt-0.5">Mileage</span>
            {tracking && (
              <span className="absolute top-1 right-[22%] w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      )}


      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-5 py-3 rounded-xl shadow-xl z-50 max-w-sm text-center">
          {toast}
        </div>
      )}

      {showAddLead && (
        <AddLeadModal
          newLead={newLead}
          setNewLead={setNewLead}
          onSave={commitAddLead}
          onClose={() => setShowAddLead(false)}
        />
      )}

      {showImport && (
        <ImportModal
          importText={importText}
          setImportText={setImportText}
          importPreview={importPreview}
          onPreview={previewImport}
          onCommit={commitImport}
          onClose={() => { setShowImport(false); setImportText(""); setImportPreview(null); }}
        />
      )}
    </div>
  );
}
