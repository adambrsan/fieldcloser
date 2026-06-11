import { CARRIERS, StatusBadge, NHDots, fmtDateTime, digitsOnly } from "./helpers.jsx";

export default function LeadDetail({
  selected, nhPreview, dispMode, customStatus, setCustomStatus,
  noteText, setNoteText, fuDate, setFuDate,
  apptDate, setApptDate, apptTime, setApptTime,
  reminderDate, setReminderDate, reminderTime, setReminderTime, reminderText, setReminderText,
  soldForm, setSoldForm,
  backToList, previewNH, commitNH, commitNI, commitCustomStatus,
  commitNote, deleteNote, commitFU, commitSold,
  commitAppointment, addApptToCalendar, clearAppointment,
  commitReminder, addReminderToCalendar, clearReminder,
  setDispMode, setNhPreview
}) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={backToList} className="text-blue-600 font-medium text-base flex items-center gap-1 -ml-1 px-1 py-1">
            <span className="text-xl">‹</span> Leads
          </button>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{selected.first_name} {selected.last_name}</h2>
            <div className="text-xs text-gray-500 mt-0.5">#{selected.lead_num} · {selected.address}, {selected.city}, {selected.state}</div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <StatusBadge status={selected.status} />
            <span className="text-xs text-gray-400">{selected.sheet_name}</span>
          </div>
        </div>
        {/* Quick actions row */}
        <div className="flex gap-2 mt-3">
          <a href={`tel:${digitsOnly(selected.phone)}`}
            className="flex-1 bg-green-500 text-white text-center py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:bg-green-600">
            📞 Call {selected.phone}
          </a>
          <a href={`https://maps.apple.com/?daddr=${encodeURIComponent(`${selected.address}, ${selected.city}, ${selected.state}`)}`}
            className="bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm active:bg-blue-600">
            🗺️
          </a>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {/* NH Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="font-semibold text-gray-700 mb-3 text-sm">Not Home Attempts</div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-gray-500 mb-1.5">AM (before 5pm)</div>
              <div className="flex items-center gap-2">
                <NHDots count={selected.am_nh} />
                <span className="text-sm font-bold text-gray-700">{selected.am_nh}/3</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1.5">PM (after 5pm)</div>
              <div className="flex items-center gap-2">
                <NHDots count={selected.pm_nh} />
                <span className="text-sm font-bold text-gray-700">{selected.pm_nh}/3</span>
              </div>
            </div>
          </div>

          {selected.am_nh >= 3 && selected.pm_nh >= 3 ? (
            <div className="bg-gray-100 text-gray-600 rounded-lg p-2.5 text-xs font-medium">⚰️ AGED OUT — Move to Aged Leads</div>
          ) : selected.am_nh >= 3 ? (
            <div className="bg-purple-50 text-purple-700 rounded-lg p-2.5 text-xs font-medium">🌙 PM ONLY — Contact after 5pm / weekends only</div>
          ) : selected.pm_nh >= 3 ? (
            <div className="bg-orange-50 text-orange-700 rounded-lg p-2.5 text-xs font-medium">☀️ AM ONLY — Contact AM only (before 5pm)</div>
          ) : selected.am_nh === 2 ? (
            <div className="bg-yellow-50 text-yellow-700 rounded-lg p-2.5 text-xs">⚠️ 1 more AM NH → PM Only</div>
          ) : selected.pm_nh === 2 ? (
            <div className="bg-yellow-50 text-yellow-700 rounded-lg p-2.5 text-xs">⚠️ 1 more PM NH → AM Only</div>
          ) : null}

          {nhPreview && (
            <div className={`mt-3 rounded-lg p-3 text-xs border ${
              nhPreview.alert?.type === "aged" ? "bg-red-50 border-red-200 text-red-700" :
              nhPreview.alert?.type === "pm" ? "bg-purple-50 border-purple-200 text-purple-700" :
              nhPreview.alert?.type === "am" ? "bg-orange-50 border-orange-200 text-orange-700" :
              nhPreview.alert?.type === "warn" ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
              "bg-blue-50 border-blue-200 text-blue-700"}`}>
              <div className="font-semibold mb-1">After logging:</div>
              <div>AM NH: {nhPreview.am} · PM NH: {nhPreview.pm}</div>
              {nhPreview.alert && <div className="mt-1 font-medium">{nhPreview.alert.msg}</div>}
              {nhPreview.newStatus !== selected.status && (
                <div className="mt-1">Status: <span className="font-semibold">{selected.status}</span> → <span className="font-semibold">{nhPreview.newStatus}</span></div>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => commitNH(dispMode)}
                  className="flex-1 bg-slate-700 text-white py-2 rounded-lg text-sm font-semibold active:bg-slate-800">
                  Confirm
                </button>
                <button onClick={() => { setDispMode(null); setNhPreview(null); }}
                  className="px-4 bg-gray-100 text-gray-600 rounded-lg text-sm active:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Disposition buttons */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="font-semibold text-gray-700 mb-3 text-sm">Log Disposition</div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => previewNH("NH_AM")}
              disabled={selected.am_nh >= 3}
              className="bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 px-2 rounded-xl text-sm">
              🏠 NH — AM
              <div className="text-xs font-normal opacity-80 mt-0.5">Before 5pm</div>
            </button>
            <button
              onClick={() => previewNH("NH_PM")}
              disabled={selected.pm_nh >= 3}
              className="bg-purple-600 active:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 px-2 rounded-xl text-sm">
              🌙 NH — PM
              <div className="text-xs font-normal opacity-80 mt-0.5">After 5pm</div>
            </button>
            <button onClick={commitNI}
              className="bg-red-500 active:bg-red-600 text-white font-semibold py-4 rounded-xl text-sm">
              🚫 Not Interested
            </button>
            <button onClick={() => setDispMode(dispMode === "sold" ? null : "sold")}
              className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-4 rounded-xl text-sm">
              💰 Sold
            </button>
            <button onClick={() => setDispMode(dispMode === "appt" ? null : "appt")}
              className="bg-green-600 active:bg-green-700 text-white font-semibold py-4 rounded-xl text-sm">
              📅 Appointment
            </button>
            <button onClick={() => setDispMode(dispMode === "fu" ? null : "fu")}
              className="bg-amber-500 active:bg-amber-600 text-white font-semibold py-4 rounded-xl text-sm">
              📌 Follow-Up
            </button>
            <button onClick={() => setDispMode(dispMode === "reminder" ? null : "reminder")}
              className="bg-indigo-500 active:bg-indigo-600 text-white font-semibold py-4 rounded-xl text-sm">
              ⏰ Reminder
            </button>
            <button onClick={() => setDispMode(dispMode === "custom" ? null : "custom")}
              className="bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold py-4 rounded-xl text-sm">
              ✏️ Set Status
            </button>
          </div>

          {/* Sold form */}
          {dispMode === "sold" && (
            <div className="mt-3 space-y-2 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <select value={soldForm.carrier} onChange={e => setSoldForm(f => ({...f, carrier: e.target.value}))}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Carrier…</option>
                {CARRIERS.map(c => <option key={c}>{c}</option>)}
              </select>
              <input value={soldForm.coverage} onChange={e => setSoldForm(f => ({...f, coverage: e.target.value}))}
                placeholder="Coverage amount (e.g. $10,000)"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <input value={soldForm.premium} onChange={e => setSoldForm(f => ({...f, premium: e.target.value}))}
                placeholder="Premium (e.g. $50.00/mo)"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <button onClick={commitSold} disabled={!soldForm.carrier || !soldForm.premium}
                className="w-full bg-emerald-600 disabled:opacity-40 text-white py-3 rounded-xl active:bg-emerald-700 text-base font-semibold">
                Confirm Sale 🎉
              </button>
            </div>
          )}

          {/* Appointment form */}
          {dispMode === "appt" && (
            <div className="mt-3 space-y-2 bg-green-50 rounded-xl p-3 border border-green-200">
              <div className="flex gap-2">
                <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-400" />
                <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <button onClick={commitAppointment} disabled={!apptDate}
                className="w-full bg-green-600 disabled:opacity-40 text-white py-3 rounded-xl active:bg-green-700 text-base font-semibold">
                Save Appointment
              </button>
              {selected.appointment && (
                <>
                  <div className="text-sm text-green-700 font-medium pt-1 text-center">
                    ✓ {fmtDateTime(selected.appointment.appt_date, selected.appointment.appt_time)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addApptToCalendar(selected)}
                      className="flex-1 bg-slate-700 text-white px-3 py-3 rounded-xl active:bg-slate-800 text-sm font-semibold">
                      📥 Add to Calendar
                    </button>
                    <button onClick={clearAppointment}
                      className="bg-gray-200 text-gray-600 px-4 py-3 rounded-xl active:bg-gray-300 text-sm">
                      ✕ Clear
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reminder form */}
          {dispMode === "reminder" && (
            <div className="mt-3 space-y-2 bg-indigo-50 rounded-xl p-3 border border-indigo-200">
              <input value={reminderText} onChange={e => setReminderText(e.target.value)}
                placeholder="Reminder note (e.g. Call back about quote)"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div className="flex gap-2">
                <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <button onClick={commitReminder} disabled={!reminderDate}
                className="w-full bg-indigo-600 disabled:opacity-40 text-white py-3 rounded-xl active:bg-indigo-700 text-base font-semibold">
                Save Reminder
              </button>
              {selected.reminder && (
                <>
                  <div className="text-sm text-indigo-700 font-medium pt-1 text-center">
                    ✓ {fmtDateTime(selected.reminder.reminder_date, selected.reminder.reminder_time)} — {selected.reminder.text}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addReminderToCalendar(selected)}
                      className="flex-1 bg-slate-700 text-white px-3 py-3 rounded-xl active:bg-slate-800 text-sm font-semibold">
                      📥 Add to Calendar
                    </button>
                    <button onClick={clearReminder}
                      className="bg-gray-200 text-gray-600 px-4 py-3 rounded-xl active:bg-gray-300 text-sm">
                      ✕ Clear
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Follow-up form */}
          {dispMode === "fu" && (
            <div className="mt-3 flex gap-2">
              <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <button onClick={commitFU} disabled={!fuDate}
                className="bg-amber-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl active:bg-amber-600 text-base font-semibold">
                Set
              </button>
            </div>
          )}

          {/* Custom status */}
          {dispMode === "custom" && (
            <div className="mt-3 flex gap-2">
              <select value={customStatus} onChange={e => setCustomStatus(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="">Select status…</option>
                <option>AM/PM</option>
                <option>Follow-Up</option>
                <option>Appointment</option>
                <option>Medicare FU</option>
                <option>PM Only</option>
                <option>AM Only</option>
              </select>
              <button onClick={commitCustomStatus} disabled={!customStatus}
                className="bg-slate-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl active:bg-slate-800 text-base">
                Set
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="font-semibold text-gray-700 mb-2 text-sm">Notes</div>
          <div className="flex gap-2 mb-3">
            <input value={noteText} onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commitNote()}
              placeholder="Add a note…"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-400" />
            <button onClick={commitNote} disabled={!noteText.trim()}
              className="bg-slate-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl active:bg-slate-800 text-base">
              Add
            </button>
          </div>
          <div className="space-y-2">
            {(selected.notesList || []).map(note => (
              <div key={note.id} className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-sm text-amber-900 flex items-start justify-between gap-2">
                <div>
                  {note.created_at && <span className="text-xs text-amber-500 font-semibold mr-1">[{new Date(note.created_at).toLocaleString([], {month:"numeric",day:"numeric",hour:"numeric",minute:"2-digit"})}]</span>}
                  {note.text}
                </div>
                <button onClick={() => deleteNote(note.id)} className="text-amber-400 active:text-amber-600 flex-shrink-0 text-base px-1">✕</button>
              </div>
            ))}
            {(!selected.notesList || selected.notesList.length === 0) && (
              <div className="text-xs text-gray-400">No notes yet</div>
            )}
          </div>
        </div>

        {/* Lead info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Details</div>
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            <div className="text-gray-500">Lead Type</div><div className="font-medium">{selected.lead_type || "—"}</div>
            <div className="text-gray-500">Sheet</div><div>{selected.sheet_name}</div>
            <div className="text-gray-500">City</div><div>{selected.city}, {selected.state}</div>
            <div className="text-gray-500">Follow-Up</div><div>{selected.follow_up_date || "—"}</div>
            {selected.appointment && (
              <>
                <div className="text-gray-500">Appointment</div>
                <div className="font-medium text-green-700">{fmtDateTime(selected.appointment.appt_date, selected.appointment.appt_time)}</div>
              </>
            )}
            {selected.reminder && (
              <>
                <div className="text-gray-500">Reminder</div>
                <div className="font-medium text-indigo-700">{fmtDateTime(selected.reminder.reminder_date, selected.reminder.reminder_time)}</div>
              </>
            )}
            {selected.sold && (
              <>
                <div className="text-gray-500">Sold Carrier</div><div className="font-medium text-emerald-700">{selected.sold.carrier}</div>
                <div className="text-gray-500">Coverage</div><div>{selected.sold.coverage}</div>
                <div className="text-gray-500">Premium</div><div>{selected.sold.premium}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
