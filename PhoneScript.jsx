import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

// ─── helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
const EMPTY_FORM = {
  fname:"", lname:"", phone:"", state:"", date: today(), time: nowTime(),
  phoneType:"", who:"", ageOk:"", bank:"",
  coverageNow:"", coverageAmt:"", coverageType:"", hadCoverage:"",
  lookingHow:"", found:"", holdback:"", expenses:"",
  whoPays:"", burialCrem:"", summary:"",
  dob:"", decisions:"", rx:"",
  opt1cov:"", opt1mo:"", opt2cov:"", opt2mo:"", opt3cov:"", opt3mo:"",
  chosen:"", fuDate:"", notes:"",
  v1:false, v2:false, v3:false, v4:false, v5:false,
  av1:false, av2:false, av3:false,
};

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ num, title, emoji, open, onToggle, children }) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-left"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{num}</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">{emoji} {title}</span>
        <span className="text-gray-400 text-base">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-1 bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Script line ───────────────────────────────────────────────────────────────
function Script({ children }) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl px-3 py-2 text-sm text-blue-900 leading-relaxed">
      {children}
    </div>
  );
}

// ─── Coach tip ─────────────────────────────────────────────────────────────────
function Tip({ children }) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-3 py-2 text-xs text-amber-800 leading-relaxed">
      💡 {children}
    </div>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type="text" }) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <option value="">— select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={2}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
    />
  );
}

function Radio({ label, name, value, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)}
        className="accent-blue-600" />
      {label}
    </label>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 accent-blue-600 flex-shrink-0" />
      <span>{label}</span>
    </label>
  );
}

// ─── Outcome button ────────────────────────────────────────────────────────────
function OutcomeBtn({ label, color, onClick }) {
  const colors = {
    green: "bg-emerald-50 border-emerald-300 text-emerald-700 active:bg-emerald-100",
    amber: "bg-amber-50 border-amber-300 text-amber-700 active:bg-amber-100",
    red:   "bg-red-50 border-red-300 text-red-700 active:bg-red-100",
    gray:  "bg-gray-50 border-gray-300 text-gray-600 active:bg-gray-100",
    blue:  "bg-blue-50 border-blue-300 text-blue-700 active:bg-blue-100",
  };
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${colors[color]} transition-colors`}
    >
      {label}
    </button>
  );
}

// ─── Call log row ──────────────────────────────────────────────────────────────
function outcomeColor(o) {
  if (o === "Sold") return "bg-emerald-100 text-emerald-700";
  if (o === "Follow-up") return "bg-amber-100 text-amber-700";
  if (o === "No home") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function PhoneScriptView({ showToast }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, date: today(), time: nowTime() });
  const [open, setOpen] = useState([true, false, false, false, false]);
  const [callLog, setCallLog] = useState([]);
  const [logTab, setLogTab] = useState("script");
  const [saving, setSaving] = useState(false);

  // load today's call log from Supabase on mount
  useEffect(() => {
    loadLog();
  }, []);

  async function loadLog() {
    const { data } = await supabase
      .from("phone_call_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setCallLog(data);
  }

  function set(field) { return val => setForm(f => ({ ...f, [field]: val })); }
  function setCheck(field) { return val => setForm(f => ({ ...f, [field]: val })); }
  function toggleSection(i) {
    setOpen(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  function newCall() {
    setForm({ ...EMPTY_FORM, date: today(), time: nowTime() });
    setOpen([true, false, false, false, false]);
    setLogTab("script");
  }

  async function logCall(outcome) {
    setSaving(true);
    const entry = {
      call_date: form.date,
      call_time: form.time,
      first_name: form.fname,
      last_name: form.lname,
      phone: form.phone,
      state: form.state,
      who_for: form.who,
      has_bank: form.bank,
      outcome,
      option_chosen: form.chosen,
      follow_up_date: form.fuDate || null,
      notes: form.notes,
    };
    const { error } = await supabase.from("phone_call_log").insert(entry);
    if (error) {
      showToast("Save failed — " + error.message);
    } else {
      showToast(`✅ Call logged as "${outcome}"`);
      await loadLog();
    }
    setSaving(false);
  }

  function exportCSV() {
    if (!callLog.length) { showToast("No calls to export yet"); return; }
    const headers = ["Date","Time","First","Last","Phone","State","Outcome","Option","F/U Date","Notes"];
    const rows = callLog.map(c => [
      c.call_date, c.call_time, c.first_name, c.last_name, c.phone,
      c.state, c.outcome, c.option_chosen, c.follow_up_date, c.notes
    ].map(v => `"${(v||"").replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `phone_log_${today()}.csv`;
    a.click();
  }

  const todayLog = callLog.filter(c => c.call_date === today());
  const soldCount = callLog.filter(c => c.outcome === "Sold").length;
  const fuCount = callLog.filter(c => c.outcome === "Follow-up").length;
  const nhCount = callLog.filter(c => c.outcome === "No home").length;

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-gray-900 text-lg">📞 Phone Script</div>
          <div className="flex gap-2">
            <button onClick={newCall}
              className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold active:bg-gray-200">
              + New call
            </button>
            <button onClick={exportCSV}
              className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-semibold active:bg-emerald-200">
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-blue-50 rounded-xl py-1.5">
            <div className="text-lg font-bold text-blue-600">{todayLog.length}</div>
            <div className="text-[10px] text-blue-500">Today</div>
          </div>
          <div className="bg-emerald-50 rounded-xl py-1.5">
            <div className="text-lg font-bold text-emerald-600">{soldCount}</div>
            <div className="text-[10px] text-emerald-500">Sold</div>
          </div>
          <div className="bg-amber-50 rounded-xl py-1.5">
            <div className="text-lg font-bold text-amber-600">{fuCount}</div>
            <div className="text-[10px] text-amber-500">F/U</div>
          </div>
          <div className="bg-red-50 rounded-xl py-1.5">
            <div className="text-lg font-bold text-red-500">{nhCount}</div>
            <div className="text-[10px] text-red-400">No home</div>
          </div>
        </div>

        {/* Tab row */}
        <div className="flex mt-3 border-b border-gray-100">
          {["script","log"].map(t => (
            <button key={t} onClick={() => setLogTab(t)}
              className={`flex-1 py-1.5 text-xs font-semibold capitalize border-b-2 -mb-px transition-colors ${
                logTab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400"
              }`}>
              {t === "script" ? "📋 Script" : `📒 Call log (${callLog.length})`}
            </button>
          ))}
        </div>
      </div>

      {logTab === "log" ? (
        /* ── CALL LOG TAB ─────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {callLog.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-12">No calls logged yet</div>
          )}
          {callLog.map((c, i) => (
            <div key={i} className="mb-3 bg-white border border-gray-200 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-800 text-sm">
                  {c.first_name} {c.last_name}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${outcomeColor(c.outcome)}`}>
                  {c.outcome}
                </span>
              </div>
              <div className="text-xs text-gray-500">{c.phone} · {c.state}</div>
              <div className="text-xs text-gray-400">{c.call_date} {c.call_time}</div>
              {c.option_chosen && <div className="text-xs text-blue-600 mt-1">Option: {c.option_chosen}</div>}
              {c.follow_up_date && <div className="text-xs text-amber-600">F/U: {c.follow_up_date}</div>}
              {c.notes && <div className="text-xs text-gray-600 mt-1 italic">{c.notes}</div>}
            </div>
          ))}
        </div>
      ) : (
        /* ── SCRIPT TAB ────────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto p-4 pb-24">

          {/* Prospect info */}
          <div className="mb-3 bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prospect info</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><Input value={form.fname} onChange={set("fname")} placeholder="First" /></Field>
              <Field label="Last name"><Input value={form.lname} onChange={set("lname")} placeholder="Last" /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" /></Field>
              <Field label="State"><Input value={form.state} onChange={set("state")} placeholder="IL" /></Field>
              <Field label="Date"><Input type="date" value={form.date} onChange={set("date")} /></Field>
              <Field label="Time"><Input type="time" value={form.time} onChange={set("time")} /></Field>
            </div>
            <Field label="Phone type">
              <div className="flex gap-4">
                <Radio label="Cell" name="phonetype" value="Cell" checked={form.phoneType==="Cell"} onChange={set("phoneType")} />
                <Radio label="Landline" name="phonetype" value="Landline" checked={form.phoneType==="Landline"} onChange={set("phoneType")} />
              </div>
            </Field>
          </div>

          {/* 0 — Opener */}
          <Section num="0" title="Opener & pre-qualification" emoji="👋" open={open[0]} onToggle={() => toggleSection(0)}>
            <Script>"Hi, this is [Your Name] — I'm the licensed insurance agent that will be working with you today."</Script>
            <Tip>Use their first name throughout. Warm, curious tone — lean in.</Tip>
            <Script>"Who are we looking to get life insurance for today — yourself, or a loved one?"</Script>
            <Field label="For:">
              <div className="flex gap-4">
                <Radio label="Themselves" name="who" value="Themselves" checked={form.who==="Themselves"} onChange={set("who")} />
                <Radio label="A loved one" name="who" value="Loved one" checked={form.who==="Loved one"} onChange={set("who")} />
              </div>
            </Field>
            <Script>"Perfect. And you're between the ages of 50 and 80, is that correct?"</Script>
            <Field label="Age 50–80?">
              <div className="flex gap-4">
                <Radio label="Yes ✓" name="ageok" value="Yes" checked={form.ageOk==="Yes"} onChange={set("ageOk")} />
                <Radio label="No — disqualify" name="ageok" value="No" checked={form.ageOk==="No"} onChange={set("ageOk")} />
              </div>
            </Field>
            <Script>"Great. And you reside in which state?"</Script>
            <Script>"And for discount purposes — do you have an active account at a local bank or credit union?"</Script>
            <Field label="Has bank/CU?">
              <div className="flex gap-4">
                <Radio label="Yes" name="bank" value="Yes" checked={form.bank==="Yes"} onChange={set("bank")} />
                <Radio label="No" name="bank" value="No" checked={form.bank==="No"} onChange={set("bank")} />
              </div>
            </Field>
            <Script>"Thank you for that. And so I can better help you, can I get your first and last name please?"</Script>
            <Tip>
              {form.phoneType === "Cell"
                ? "Cell phone → text them your photo ID & NPN number."
                : form.phoneType === "Landline"
                ? "Landline → have them write down your license/NPN. Say: \"This is like my social security number with the DOI — you can look me up anytime.\""
                : "Cell → text photo ID/NPN. Landline → have them write your license/NPN. \"You can look me up with the DOI anytime.\""}
            </Tip>
          </Section>

          {/* 1 — Discovery */}
          <Section num="1" title="Discovery" emoji="🔍" open={open[1]} onToggle={() => toggleSection(1)}>
            <Tip>Curious tone — ask all questions before moving on.</Tip>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coverage now?">
                <Select value={form.coverageNow} onChange={set("coverageNow")} options={["Yes","No"]} />
              </Field>
              <Field label="Amount (if yes)">
                <Input value={form.coverageAmt} onChange={set("coverageAmt")} placeholder="e.g. $10,000" />
              </Field>
              <Field label="Replacing or increasing?">
                <Select value={form.coverageType} onChange={set("coverageType")} options={["Replacing","Increasing","N/A"]} />
              </Field>
              <Field label="Had coverage before?">
                <Select value={form.hadCoverage} onChange={set("hadCoverage")} options={["Yes","No"]} />
              </Field>
              <Field label="How long looking?">
                <Input value={form.lookingHow} onChange={set("lookingHow")} placeholder="e.g. 6 months" />
              </Field>
              <Field label="What have they found?">
                <Input value={form.found} onChange={set("found")} placeholder="Notes..." />
              </Field>
            </div>
            <Field label="What's held them back?">
              <Textarea value={form.holdback} onChange={set("holdback")} />
            </Field>
            <Field label="Expenses they're concerned about">
              <Textarea value={form.expenses} onChange={set("expenses")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Who will pay?">
                <Input value={form.whoPays} onChange={set("whoPays")} />
              </Field>
              <Field label="Burial or cremation?">
                <Select value={form.burialCrem} onChange={set("burialCrem")} options={["Burial","Cremation","Undecided"]} />
              </Field>
            </div>
            <Script>"So have you thought about what would happen if you couldn't find another policy that was affordable? What would you do then?"</Script>
            <Script>"I know it's uncomfortable to really consider it... but you've been thinking about this for a while and haven't done anything yet. What does it look like for your family if you stay in the exact same spot?"</Script>
            <Script>"If there was a way to get exactly what you're looking for at an affordable cost — would that help you out?"</Script>
            <Field label="Summary — their own words">
              <Textarea value={form.summary} onChange={set("summary")} placeholder="Summarize what the prospect just told you..." />
            </Field>
            <Script>"Does it sound like I got all that right? Is there anything else you're concerned about?"</Script>
          </Section>

          {/* 2 — Qualification */}
          <Section num="2" title="Qualification (SLICE)" emoji="📋" open={open[2]} onToggle={() => toggleSection(2)}>
            <Script>"What I'll do to make this really simple is just get your prescriptions — that way I can see all the plans available in your state, let you know which ones you'd be approved for, and which gives you the most bang for your buck. Especially if you're on a fixed income — does that sound fair?"</Script>
            <Tip>Confirm name spelling, DOB. Verify who controls the policy and can make decisions.</Tip>
            <div className="grid grid-cols-2 gap-3">
              <Field label="DOB"><Input value={form.dob} onChange={set("dob")} placeholder="MM/DD/YYYY" /></Field>
              <Field label="Can make own decisions?">
                <Select value={form.decisions} onChange={set("decisions")} options={["Yes","Needs help"]} />
              </Field>
            </div>
            <Field label="Prescriptions / health notes">
              <Textarea value={form.rx} onChange={set("rx")} placeholder="Meds, conditions, anything relevant..." />
            </Field>
            <Script>"The protection we're looking at starts at $5k and goes up to $30k. Most of my clients set aside somewhere between $60–$80 a month. Some are higher, some lower — we can tailor it to whatever fits best."</Script>
            <Tip>Note: they'll need a valid checking or savings account (routing & account number) to qualify — don't need it right now.</Tip>
          </Section>

          {/* 3 — Value */}
          <Section num="3" title="Value presentation" emoji="⭐" open={open[3]} onToggle={() => toggleSection(3)}>
            <Tip>Detached & confident tone. Check each point off as you cover it.</Tip>
            <div className="space-y-2">
              <Check
                checked={form.v1} onChange={setCheck("v1")}
                label={<><strong>Permanent whole life</strong> — "This is whole life coverage. You're covered for the rest of your life — not one of those term plans where coverage stops at a certain age. Funeral expenses are never going away, so why would you want a policy that goes away?"</>}
              />
              <Check
                checked={form.v2} onChange={setCheck("v2")}
                label={<><strong>Price locked</strong> — "The rates are locked in for life. Whatever the price is now is what it will always be."</>}
              />
              <Check
                checked={form.v3} onChange={setCheck("v3")}
                label={<><strong>Can't be cancelled</strong> — "As long as you keep up with it, we can't cancel you for any reason."</>}
              />
              <Check
                checked={form.v4} onChange={setCheck("v4")}
                label={<><strong>Immediate coverage</strong> — "A lot of plans make people pay in for two years before they're even covered. Once your first payment is made with us, you're fully covered from day one."</>}
              />
              <Check
                checked={form.v5} onChange={setCheck("v5")}
                label={<><strong>Fast claims payout</strong> — "In my 23 years doing this, the carriers I work with pay claims faster than anyone else I've seen — we're talking within 24 hours of the claim being called in. The funeral home wants their money up front, and this makes sure your family has it when they need it."</>}
              />
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Added value</div>
            <div className="space-y-2">
              <Check
                checked={form.av1} onChange={setCheck("av1")}
                label={<><strong>Planning guide</strong> — "I'll send out a planning guide your family can fill out so they know exactly how you want things done. Tell your loved ones to contact me first — even before the funeral home — so I can help get the claim started."</>}
              />
              <Check
                checked={form.av2} onChange={setCheck("av2")}
                label={<><strong>Funeral discount network</strong> — "We work with businesses that offer significant discounts on caskets, vaults, headstones, and urns. A funeral home might charge $3,600 for a casket — we can ship the same one for $1,600–$2,000 within 24–48 hours."</>}
              />
              <Check
                checked={form.av3} onChange={setCheck("av3")}
                label={<><strong>Direct payout</strong> — "Rather than your family taking the policy to the funeral home and letting them run the show, all they do is call us. We overnight a check or deposit directly to their account — within a day they have the money to pay whoever needs to be paid."</>}
              />
            </div>
            <Script>"Does that make sense to you?"</Script>
          </Section>

          {/* 4 — Close */}
          <Section num="4" title="Recommendation & close" emoji="✅" open={open[4]} onToggle={() => toggleSection(4)}>
            <Script>"Now I'm going to give you my recommendation based on everything we've talked about today. Most of my clients on a fixed income set aside $60–$80 a month — would you like to go a little higher, a little lower, or does that sound good?"</Script>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Option 1 — Coverage"><Input value={form.opt1cov} onChange={set("opt1cov")} placeholder="e.g. $10,000" /></Field>
                <Field label="Option 1 — Monthly"><Input value={form.opt1mo} onChange={set("opt1mo")} placeholder="e.g. $58/mo" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Option 2 — Coverage"><Input value={form.opt2cov} onChange={set("opt2cov")} placeholder="e.g. $15,000" /></Field>
                <Field label="Option 2 — Monthly"><Input value={form.opt2mo} onChange={set("opt2mo")} placeholder="e.g. $74/mo" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Option 3 — Coverage"><Input value={form.opt3cov} onChange={set("opt3cov")} placeholder="e.g. $20,000" /></Field>
                <Field label="Option 3 — Monthly"><Input value={form.opt3mo} onChange={set("opt3mo")} placeholder="e.g. $89/mo" /></Field>
              </div>
            </div>
            <Field label="Option they chose">
              <Input value={form.chosen} onChange={set("chosen")} placeholder="e.g. Option 2 — $15k @ $74/mo" />
            </Field>
            <Script>"Ok great — let me finish gathering your info. I'll send you a text to sign."</Script>
            <Tip>Landline with no cell: use the recording option instead of text-to-sign.</Tip>
            <Field label="Call notes">
              <Textarea value={form.notes} onChange={set("notes")} placeholder="Objections, follow-up details, anything notable..." />
            </Field>
            <Field label="Follow-up date (if needed)">
              <Input type="date" value={form.fuDate} onChange={set("fuDate")} />
            </Field>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Log this call</div>
            <div className="grid grid-cols-2 gap-2">
              <OutcomeBtn label="✅ Sold" color="green" onClick={() => logCall("Sold")} />
              <OutcomeBtn label="📅 Follow-up" color="amber" onClick={() => logCall("Follow-up")} />
              <OutcomeBtn label="🚫 No home" color="red" onClick={() => logCall("No home")} />
              <OutcomeBtn label="👎 Not interested" color="gray" onClick={() => logCall("Not interested")} />
              <OutcomeBtn label="📞 Callback" color="blue" onClick={() => logCall("Callback")} />
              <OutcomeBtn label="↩️ No answer" color="gray" onClick={() => logCall("No answer")} />
            </div>
            {saving && <div className="text-center text-xs text-blue-500 mt-1">Saving...</div>}
          </Section>

        </div>
      )}
    </div>
  );
}
