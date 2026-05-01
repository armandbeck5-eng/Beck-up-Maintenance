import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — fill these in before deploying
// ─────────────────────────────────────────────────────────────────────────────

// FORMSPREE — 3 seconds to set up:
// 1. Go to https://formspree.io/f/new  (no account needed)
// 2. Enter  admin@beckestates.co.za  as the destination email
// 3. Copy the form ID (e.g. "xpznkgvb") and paste below
const FORMSPREE_ID = "mnjwarzd"; // e.g. "xpznkgvb"

// SUPABASE — free backend for the admin request log:
// 1. Go to https://supabase.com → New project (free)
// 2. SQL Editor → run the schema in  supabase-schema.sql  (included in this repo)
// 3. Settings → API → copy Project URL and anon/public key below
const SUPABASE_URL  = "https://gvadybgucamhtgvxrtyx.supabase.co";  // e.g. "https://xxxx.supabase.co"
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2YWR5Ymd1Y2FtaHRndnhydHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDU2MjQsImV4cCI6MjA5MzA4MTYyNH0.KWhMBfoDHoV6WSjVKOGAxrbJsvfUqHWSSYRVzWeMo3A";

// Supabase client (gracefully disabled if not yet configured)
const supabase =
  SUPABASE_URL !== "YOUR_SUPABASE_URL"
    ? createClient(SUPABASE_URL, SUPABASE_ANON)
    : null;

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO UPLOAD — stores photos in Supabase Storage bucket "maintenance-photos"
// ─────────────────────────────────────────────────────────────────────────────
async function uploadPhotos(photos, requestId) {
  if (!supabase || !photos.length) return [];
  const urls = [];
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    // Convert base64 to blob
    const res  = await fetch(photo.url);
    const blob = await res.blob();
    const ext  = photo.name.split(".").pop() || "jpg";
    const path = `${requestId}/${i + 1}.${ext}`;
    const { error } = await supabase.storage
      .from("maintenance-photos")
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("maintenance-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO  (base64 embedded so it works without a server)
// ─────────────────────────────────────────────────────────────────────────────
const LOGO_URL = "https://raw.githubusercontent.com/armandbeck5-eng/Beck-up-Maintenance/main/logo.png";

// ADMIN PASSWORD — change this to whatever you want
const ADMIN_PASSWORD = "BeckUp2024!";

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 1, name: "Air-Conditioning", icon: "❄️", issues: ["AC not cooling","AC not heating","AC leaking water","AC making noise","AC remote not working","AC not switching on"] },
  { id: 2, name: "Appliances",       icon: "🔌", issues: ["Oven/Stove not working","Dishwasher not working","Washing machine fault","Tumble dryer fault","Fridge/Freezer fault","Microwave fault"] },
  { id: 3, name: "Doors & Windows",  icon: "🚪", issues: ["Door not locking","Door handle broken","Window won't open/close","Window lock broken","Sliding door off track","Door frame damaged"] },
  { id: 4, name: "Electrical",       icon: "⚡", issues: ["No power / tripped breaker","Light fitting not working","Plug point not working","Geyser not heating","Intercom fault","Electric fence fault"] },
  { id: 5, name: "Garden & Exterior",icon: "🌿", issues: ["Garden irrigation fault","Boundary wall damaged","Gate motor fault","Outdoor lighting fault","Pool pump fault","Paving damaged"] },
  { id: 6, name: "Plumbing",         icon: "💧", issues: ["Burst pipe","Leaking tap","Blocked drain","Toilet not flushing","No hot water","Low water pressure","Geyser leaking"] },
  { id: 7, name: "Security",         icon: "🔒", issues: ["Alarm fault","CCTV not working","Access control broken","Safe not opening","Security gate damaged"] },
  { id: 8, name: "Structure & Interior", icon: "🏠", issues: ["Ceiling leak","Roof damage","Wall crack","Paint peeling","Cupboard damaged","Gutter blocked"] },
];

const STATUS_META = {
  pending:     { label: "Pending",     bg: "#2a2200", text: "#d4af37", border: "#d4af37" },
  in_progress: { label: "In Progress", bg: "#001a2a", text: "#38bdf8", border: "#38bdf8" },
  resolved:    { label: "Resolved",    bg: "#002a1a", text: "#4ade80", border: "#4ade80" },
  cancelled:   { label: "Cancelled",   bg: "#2a0000", text: "#f87171", border: "#f87171" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function dbInsert(req) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("maintenance_requests").insert([req]).select().single();
  if (error) console.error("Supabase insert error:", error);
  return data;
}
async function dbUpdatePhotos(id, photoUrls) {
  if (!supabase) return;
  await supabase.from("maintenance_requests")
    .update({ photo_urls: photoUrls, photo_count: photoUrls.length })
    .eq("id", id);
}
async function dbList() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("Supabase list error:", error); return []; }
  return data || [];
}
async function dbUpdateStatus(id, status) {
  if (!supabase) return;
  const { error } = await supabase.from("maintenance_requests").update({ status }).eq("id", id);
  if (error) console.error("Supabase update error:", error);
}

// Fallback: localStorage when Supabase not configured
const LS_KEY = "beckup_requests";
const lsGet  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
const lsSave = (r) => localStorage.setItem(LS_KEY, JSON.stringify(r));

// ─────────────────────────────────────────────────────────────────────────────
// FORMSPREE SUBMIT
// ─────────────────────────────────────────────────────────────────────────────
async function submitToFormspree(fields) {
  if (FORMSPREE_ID === "YOUR_FORMSPREE_ID") {
    console.warn("Formspree not configured — skipping email.");
    return true; // still let the form succeed locally
  }
  const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(fields),
  });
  return res.ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap');

  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  :root{
    --gold:#d4af37;--gold-l:#f0d060;--gold-d:#8a7220;--gold-xd:#3a3010;
    --black:#060606;--s1:#101010;--s2:#181818;--s3:#202020;
    --border:#252525;--text:#f0ece4;--muted:#88887f;
    --ff-display:'Cormorant Garamond',serif;--ff-body:'Montserrat',sans-serif;
  }

  body{background:var(--black);color:var(--text);font-family:var(--ff-body);font-size:14px;line-height:1.6;min-height:100vh}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--black)}::-webkit-scrollbar-thumb{background:var(--gold-d);border-radius:2px}

  .app{
    min-height:100vh;
    background:
      radial-gradient(ellipse 60% 40% at 10% 0%,rgba(212,175,55,.07) 0%,transparent 70%),
      radial-gradient(ellipse 50% 40% at 90% 100%,rgba(212,175,55,.04) 0%,transparent 70%),
      var(--black);
  }

  /* NAV */
  .nav{
    position:sticky;top:0;z-index:100;height:68px;
    background:rgba(6,6,6,.96);backdrop-filter:blur(16px);
    border-bottom:1px solid var(--border);
    padding:0 28px;display:flex;align-items:center;justify-content:space-between;
  }
  .nav-brand{display:flex;align-items:center;gap:12px;text-decoration:none}
  .nav-logo-img{height:40px;width:40px;object-fit:contain}
  .nav-brand-text{display:flex;flex-direction:column;line-height:1.15}
  .nav-brand-top{font-family:var(--ff-display);font-size:18px;font-weight:700;letter-spacing:.06em;color:var(--gold)}
  .nav-brand-sub{font-size:9px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
  .nav-tabs{display:flex;gap:2px}
  .nav-tab{padding:8px 18px;background:none;border:none;cursor:pointer;font-family:var(--ff-body);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);transition:color .2s;position:relative}
  .nav-tab:hover{color:var(--text)}
  .nav-tab.active{color:var(--gold)}
  .nav-tab.active::after{content:'';position:absolute;bottom:-1px;left:18px;right:18px;height:1px;background:var(--gold)}

  /* LAYOUT */
  .page{max-width:620px;margin:0 auto;padding:52px 24px 96px}
  .page-wide{max-width:1120px;margin:0 auto;padding:52px 24px 96px}

  /* HERO */
  .hero{text-align:center;margin-bottom:56px}
  .hero-logo{width:88px;height:88px;object-fit:contain;margin:0 auto 20px;display:block;filter:drop-shadow(0 0 18px rgba(212,175,55,.25))}
  .hero-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:18px}
  .hero-eyebrow::before,.hero-eyebrow::after{content:'';display:block;width:28px;height:1px;background:var(--gold-d)}
  .hero-title{font-family:var(--ff-display);font-size:clamp(34px,6vw,52px);font-weight:600;line-height:1.1;color:var(--text);margin-bottom:14px;letter-spacing:.02em}
  .hero-title em{color:var(--gold);font-style:italic}
  .hero-sub{font-size:13px;color:var(--muted);max-width:420px;margin:0 auto;font-weight:300;line-height:1.9}

  /* DIVIDER */
  .divider{display:flex;align-items:center;gap:14px;margin-bottom:44px}
  .divider-line{flex:1;height:1px;background:var(--border)}
  .divider-gem{width:6px;height:6px;border:1px solid var(--gold-d);transform:rotate(45deg)}

  /* CATEGORIES */
  .cat-block{margin-bottom:42px}
  .cat-header{display:flex;align-items:center;gap:11px;margin-bottom:14px;padding-bottom:11px;border-bottom:1px solid var(--border)}
  .cat-icon{font-size:17px}
  .cat-name{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
  .cat-rule{flex:1;height:1px;background:linear-gradient(to right,var(--border),transparent)}
  .issues{display:flex;flex-direction:column;gap:5px}

  .issue-btn{
    width:100%;padding:13px 18px;
    background:var(--s1);border:1px solid var(--border);
    color:var(--text);font-family:var(--ff-body);font-size:13px;font-weight:400;
    text-align:left;cursor:pointer;
    transition:background .18s,border-color .18s,color .18s,padding-left .18s;
    display:flex;align-items:center;justify-content:space-between;
  }
  .issue-btn:hover{border-color:var(--gold-d);background:var(--s2);color:var(--gold-l);padding-left:24px}
  .issue-arrow{color:var(--gold-d);font-size:12px;transition:transform .18s,color .18s;flex-shrink:0}
  .issue-btn:hover .issue-arrow{transform:translateX(4px);color:var(--gold)}

  .other-btn{
    width:100%;padding:15px 18px;background:transparent;
    border:1px dashed var(--border);color:var(--muted);
    font-family:var(--ff-body);font-size:13px;cursor:pointer;text-align:left;
    transition:border-color .18s,color .18s,background .18s;
    display:flex;align-items:center;justify-content:space-between;
  }
  .other-btn:hover{border-color:var(--gold-d);color:var(--gold);background:var(--s1)}

  /* FORM */
  .back-btn{
    display:inline-flex;align-items:center;gap:8px;
    background:none;border:none;cursor:pointer;
    color:var(--muted);font-family:var(--ff-body);
    font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
    margin-bottom:30px;transition:color .18s;padding:0;
  }
  .back-btn:hover{color:var(--gold)}

  .form-card{background:var(--s1);border:1px solid var(--border);padding:36px}
  .form-badge{display:inline-block;padding:3px 11px;border:1px solid var(--gold-d);color:var(--gold);font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;margin-bottom:10px}
  .form-issue-title{font-family:var(--ff-display);font-size:26px;font-weight:600;color:var(--text);margin-bottom:28px;line-height:1.2}

  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
  @media(max-width:520px){.form-grid{grid-template-columns:1fr}}
  .fg{display:flex;flex-direction:column;gap:5px}
  .fg.span2{grid-column:1/-1}
  .flabel{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}

  .finput,.ftextarea{
    background:var(--s2);border:1px solid var(--border);
    color:var(--text);font-family:var(--ff-body);font-size:13px;
    padding:11px 13px;transition:border-color .18s,background .18s;outline:none;width:100%;
  }
  .finput:focus,.ftextarea:focus{border-color:var(--gold-d);background:var(--s3)}
  .finput::placeholder,.ftextarea::placeholder{color:var(--muted);opacity:.5}
  .ftextarea{min-height:115px;resize:vertical}

  .info-box{
    background:var(--s2);border:1px solid var(--gold-xd);
    padding:13px 16px;margin-top:18px;
    font-size:11px;color:var(--muted);
    display:flex;align-items:flex-start;gap:9px;line-height:1.7;
  }
  .info-box-icon{color:var(--gold);flex-shrink:0;margin-top:1px;font-size:13px}

  .submit-btn{
    width:100%;padding:15px;background:var(--gold);border:none;color:var(--black);
    font-family:var(--ff-body);font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
    cursor:pointer;margin-top:22px;transition:background .18s,transform .18s;
    display:flex;align-items:center;justify-content:center;gap:8px;
  }
  .submit-btn:hover{background:var(--gold-l);transform:translateY(-1px)}
  .submit-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

  /* SUCCESS */
  .success{text-align:center;padding:72px 24px}
  .success-icon{width:76px;height:76px;margin:0 auto 24px;border:1px solid var(--gold-d);background:var(--s1);display:flex;align-items:center;justify-content:center;font-size:30px}
  .success-title{font-family:var(--ff-display);font-size:34px;font-weight:600;color:var(--text);margin-bottom:10px}
  .success-sub{color:var(--muted);font-size:13px;margin-bottom:30px;font-weight:300}

  /* ADMIN */
  .admin-header{margin-bottom:36px}
  .admin-title{font-family:var(--ff-display);font-size:32px;font-weight:600;color:var(--text);margin-bottom:6px}
  .admin-sub{color:var(--muted);font-size:12px;font-weight:300}

  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:36px}
  @media(max-width:680px){.stats{grid-template-columns:repeat(2,1fr)}}
  .stat{background:var(--s1);border:1px solid var(--border);padding:18px 20px}
  .stat-label{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .stat-value{font-family:var(--ff-display);font-size:38px;font-weight:600}

  .filters{display:flex;gap:6px;margin-bottom:22px;flex-wrap:wrap}
  .fbtn{padding:5px 13px;background:none;border:1px solid var(--border);color:var(--muted);font-family:var(--ff-body);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:all .15s}
  .fbtn:hover,.fbtn.on{border-color:var(--gold-d);color:var(--gold);background:var(--s1)}

  .tbl-wrap{overflow-x:auto}
  .tbl{width:100%;border-collapse:collapse;font-size:12px}
  .tbl th{padding:11px 14px;text-align:left;font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);background:var(--s1);white-space:nowrap}
  .tbl td{padding:13px 14px;border-bottom:1px solid var(--border);vertical-align:top;background:var(--black)}
  .tbl tr:hover td{background:var(--s1)}
  .td-issue{color:var(--text);font-weight:500}
  .td-cat{color:var(--gold-d);font-size:11px;margin-top:2px}
  .td-name{color:var(--text);font-weight:500}
  .td-detail{color:var(--muted);font-size:11px;margin-top:2px}

  .status-select{background:var(--s2);border:1px solid;color:inherit;font-family:var(--ff-body);font-size:10px;font-weight:600;letter-spacing:.08em;padding:4px 8px;cursor:pointer;outline:none;text-transform:uppercase}
  .status-select:focus{outline:1px solid var(--gold-d)}

  .empty{text-align:center;padding:64px 24px;color:var(--muted);font-weight:300}
  .empty-icon{font-size:36px;opacity:.25;margin-bottom:14px}

  .setup-box{background:var(--s2);border:1px solid var(--gold-xd);padding:18px 20px;margin-top:36px;font-size:11px;color:var(--muted);line-height:1.8}
  .setup-box strong{color:var(--text)}
  .setup-box a{color:var(--gold)}
  .setup-box code{color:var(--gold);font-size:10px;background:var(--s1);padding:1px 5px}
  .setup-steps{margin-top:10px;display:flex;flex-direction:column;gap:6px}
  .setup-step{display:flex;gap:10px;align-items:flex-start}
  .setup-num{width:18px;height:18px;border:1px solid var(--gold-d);color:var(--gold);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}

  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fade{animation:fadeUp .3s ease}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{display:inline-block;animation:spin .7s linear infinite}
`;

// ─────────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────────
function Nav({ view, setView }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <img src={LOGO_URL} alt="Beck-Up" className="nav-logo-img" onError={e => e.target.style.display='none'} />
        <div className="nav-brand-text">
          <span className="nav-brand-top">Beck-Up</span>
          <span className="nav-brand-sub">Maintenance</span>
        </div>
      </div>
      <div className="nav-tabs">
        <button className={`nav-tab ${view === "report" ? "active" : ""}`} onClick={() => setView("report")}>
          Report a Problem
        </button>
        <button className={`nav-tab ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}>
          Admin
        </button>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ISSUE LIST
// ─────────────────────────────────────────────────────────────────────────────
function IssueList({ onSelect }) {
  return (
    <div className="page fade">
      <div className="hero">
        <img src={LOGO_URL} alt="Beck-Up Maintenance" className="hero-logo" onError={e => e.target.style.display='none'} />
        <div className="hero-eyebrow">Beck-Up Maintenance</div>
        <h1 className="hero-title">Report a <em>Problem</em></h1>
        <p className="hero-sub">
          Select the relevant category below and provide as much detail as possible.
          Photos or descriptions of when it started are especially helpful.
        </p>
      </div>

      <div className="divider">
        <div className="divider-line" /><div className="divider-gem" /><div className="divider-line" />
      </div>

      {CATEGORIES.map(cat => (
        <div key={cat.id} className="cat-block">
          <div className="cat-header">
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-name">{cat.name}</span>
            <div className="cat-rule" />
          </div>
          <div className="issues">
            {cat.issues.map(issue => (
              <button key={issue} className="issue-btn" onClick={() => onSelect(cat.name, issue)}>
                {issue}<span className="issue-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="cat-block">
        <div className="cat-header">
          <span className="cat-icon">❓</span>
          <span className="cat-name">Other</span>
          <div className="cat-rule" />
        </div>
        <button className="other-btn" onClick={() => onSelect("Other", null)}>
          My problem is not listed above
          <span style={{ color: "var(--gold-d)", fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST FORM
// ─────────────────────────────────────────────────────────────────────────────
function RequestForm({ category, issue, onBack }) {
  const isOther = !issue;
  const [f, setF] = useState({ issue_custom:"", description:"", reporter_name:"", reporter_email:"", reporter_phone:"", property_address:"", unit_number:"" });
  const [busy, setBusy]     = useState(false);
  const [done, setDone]     = useState(false);
  const [err,  setErr]      = useState("");
  const [photos, setPhotos] = useState([]); // base64 strings
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { setErr("Each photo must be under 5MB."); return; }
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos(prev => [...prev, { url: ev.target.result, name: file.name }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (i) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const resolvedIssue = isOther ? f.issue_custom : issue;
    const payload = {
      category,
      issue: resolvedIssue,
      description:      f.description,
      reporter_name:    f.reporter_name,
      reporter_email:   f.reporter_email,
      reporter_phone:   f.reporter_phone  || null,
      property_address: f.property_address,
      unit_number:      f.unit_number     || null,
      photo_count:      photos.length,
      status:           "pending",
    };

    // 1. Send email via Formspree (photos attached as note — actual urls added after upload)
    const emailOk = await submitToFormspree({
      ...payload,
      _subject: `New Maintenance Request — ${resolvedIssue} (${category})`,
      _replyto: f.reporter_email,
      photos: photos.length > 0 ? `${photos.length} photo(s) attached — view in admin dashboard` : "No photos",
    });
    if (!emailOk) { setErr("Email send failed — please try again."); setBusy(false); return; }

    // 2. Save to Supabase (or localStorage fallback)
    let savedRecord = null;
    if (supabase) {
      savedRecord = await dbInsert({ ...payload, created_at: new Date().toISOString() });
    } else {
      const all = lsGet();
      const localRec = { ...payload, id: Date.now(), created_at: new Date().toISOString() };
      all.unshift(localRec);
      lsSave(all);
      savedRecord = localRec;
    }

    // 3. Upload photos and link them to the record
    if (photos.length > 0 && savedRecord?.id) {
      const photoUrls = await uploadPhotos(photos, savedRecord.id);
      await dbUpdatePhotos(savedRecord.id, photoUrls);
    }

    setBusy(false); setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) return (
    <div className="page fade">
      <div className="success">
        <div className="success-icon">✓</div>
        <h2 className="success-title">Request Received</h2>
        <p className="success-sub">
          Your request has been logged and emailed to our team.<br />
          We'll follow up within 24–48 hours.
        </p>
        <button className="submit-btn" style={{ width:"auto", padding:"13px 40px", margin:"0 auto" }} onClick={onBack}>
          Submit Another Request
        </button>
      </div>
    </div>
  );

  return (
    <div className="page fade">
      <button className="back-btn" onClick={onBack}>← Back to categories</button>
      <div className="form-card">
        <div className="form-badge">{category}</div>
        <div className="form-issue-title">{isOther ? "Unlisted Problem" : issue}</div>

        <form onSubmit={handleSubmit}>
          {isOther && (
            <div className="fg" style={{ marginBottom: 14 }}>
              <label className="flabel">Describe the Issue *</label>
              <input className="finput" placeholder="Brief description of the problem" value={f.issue_custom} onChange={e=>set("issue_custom",e.target.value)} required />
            </div>
          )}
          <div className="form-grid">
            <div className="fg">
              <label className="flabel">Full Name *</label>
              <input className="finput" placeholder="Your full name" value={f.reporter_name} onChange={e=>set("reporter_name",e.target.value)} required />
            </div>
            <div className="fg">
              <label className="flabel">Email Address *</label>
              <input className="finput" type="email" placeholder="your@email.com" value={f.reporter_email} onChange={e=>set("reporter_email",e.target.value)} required />
            </div>
            <div className="fg">
              <label className="flabel">Phone Number</label>
              <input className="finput" placeholder="+27 XX XXX XXXX" value={f.reporter_phone} onChange={e=>set("reporter_phone",e.target.value)} />
            </div>
            <div className="fg">
              <label className="flabel">Unit / Stand No.</label>
              <input className="finput" placeholder="Unit or Stand No." value={f.unit_number} onChange={e=>set("unit_number",e.target.value)} />
            </div>
            <div className="fg span2">
              <label className="flabel">Property Address *</label>
              <input className="finput" placeholder="Street address of the property" value={f.property_address} onChange={e=>set("property_address",e.target.value)} required />
            </div>
            <div className="fg span2">
              <label className="flabel">Description *</label>
              <textarea className="ftextarea" placeholder="Describe the problem in detail — when did it start, how severe is it?" value={f.description} onChange={e=>set("description",e.target.value)} required />
            </div>
          </div>

          {/* PHOTO UPLOAD */}
          <div style={{ marginTop:8, marginBottom:4 }}>
            <label className="flabel" style={{ display:"block", marginBottom:8 }}>Photos <span style={{color:"var(--muted)",fontWeight:300,textTransform:"none",letterSpacing:0}}>(optional — up to 5)</span></label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:8 }}>
              {photos.map((p,i) => (
                <div key={i} style={{ position:"relative", width:72, height:72 }}>
                  <img src={p.url} alt="" style={{ width:72, height:72, objectFit:"cover", border:"1px solid var(--border)" }} />
                  <button type="button" onClick={() => removePhoto(i)}
                    style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:"#f87171", border:"none", color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✕</button>
                </div>
              ))}
              {photos.length < 5 && (
                <label style={{ width:72, height:72, border:"1px dashed var(--border)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", background:"var(--s2)", transition:"border-color .18s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold-d)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                  <span style={{ fontSize:22, color:"var(--muted)" }}>📷</span>
                  <span style={{ fontSize:9, color:"var(--muted)", marginTop:3, letterSpacing:"0.05em" }}>ADD</span>
                  <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handlePhotoAdd} />
                </label>
              )}
            </div>
            <div style={{ fontSize:10, color:"var(--muted)" }}>JPG, PNG or WEBP · Max 5MB each · Up to 5 photos</div>
          </div>

          {err && <div style={{ color:"#f87171", fontSize:12, marginTop:10 }}>⚠ {err}</div>}

          <div className="info-box">
            <span className="info-box-icon">✉</span>
            <div>
              This request will be emailed to <strong style={{ color:"var(--text)" }}>admin@beckestates.co.za</strong> and logged in the admin dashboard. Our team will follow up within 24–48 hours.
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={busy}>
            {busy ? <><span className="spin">⟳</span> Submitting…</> : "Submit Maintenance Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT PAGE
// ─────────────────────────────────────────────────────────────────────────────
function ReportPage() {
  const [step, setStep] = useState("list");
  const [sel,  setSel]  = useState(null);
  const select = (cat, issue) => { setSel({ cat, issue }); setStep("form"); window.scrollTo({ top:0, behavior:"smooth" }); };
  if (step === "form") return <RequestForm category={sel.cat} issue={sel.issue} onBack={() => setStep("list")} />;
  return <IssueList onSelect={select} />;
}


// ─────────────────────────────────────────────────────────────────────────────
// ADMIN LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pw, setPw]     = useState("");
  const [err, setErr]   = useState("");
  const [show, setShow] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem("beckup_admin", "1");
      onLogin();
    } else {
      setErr("Incorrect password. Please try again.");
      setPw("");
    }
  };

  return (
    <div className="page fade" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"70vh" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <img src={LOGO_URL} alt="Beck-Up" style={{ width:72, height:72, objectFit:"contain", marginBottom:16, filter:"drop-shadow(0 0 12px rgba(212,175,55,.3))" }} onError={e=>e.target.style.display="none"} />
          <div style={{ fontFamily:"var(--ff-display)", fontSize:28, fontWeight:600, color:"var(--text)", marginBottom:6 }}>Admin Access</div>
          <div style={{ fontSize:12, color:"var(--muted)", fontWeight:300 }}>Beck-Up Maintenance Dashboard</div>
        </div>
        <div className="form-card">
          <form onSubmit={handleLogin}>
            <div className="fg" style={{ marginBottom:16 }}>
              <label className="flabel">Password</label>
              <div style={{ position:"relative" }}>
                <input className="finput" type={show ? "text" : "password"} placeholder="Enter admin password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} required autoFocus style={{ paddingRight:44 }} />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:14 }}>{show ? "🙈" : "👁"}</button>
              </div>
            </div>
            {err && <div style={{ color:"#f87171", fontSize:12, marginBottom:12 }}>⚠ {err}</div>}
            <button type="submit" className="submit-btn">Enter Dashboard</button>
          </form>
        </div>
        <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:"var(--muted)" }}>Only authorised Beck Estates staff may access this area.</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AdminPage() {
  const [rows,    setRows]   = useState([]);
  const [loading, setLoading]= useState(true);
  const [filter,  setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const data = supabase ? await dbList() : lsGet();
    setRows(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    if (supabase) {
      await dbUpdateStatus(id, status);
    } else {
      const updated = rows.map(r => r.id === id ? { ...r, status } : r);
      lsSave(updated);
    }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const counts = {
    all:         rows.length,
    pending:     rows.filter(r=>r.status==="pending").length,
    in_progress: rows.filter(r=>r.status==="in_progress").length,
    resolved:    rows.filter(r=>r.status==="resolved").length,
    cancelled:   rows.filter(r=>r.status==="cancelled").length,
  };
  const visible = filter === "all" ? rows : rows.filter(r=>r.status===filter);
  const fmt = iso => new Date(iso).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"});

  return (
    <div className="page-wide fade">
      <div className="admin-header">
        <h2 className="admin-title">Maintenance Dashboard</h2>
        <p className="admin-sub">Beck-Up Maintenance — Incoming requests from tenants &amp; property owners</p>
      </div>

      <div className="stats">
        {[
          {l:"Total",      v:counts.all,         c:"var(--gold)"},
          {l:"Pending",    v:counts.pending,      c:"#facc15"},
          {l:"In Progress",v:counts.in_progress,  c:"#38bdf8"},
          {l:"Resolved",   v:counts.resolved,     c:"#4ade80"},
        ].map(s=>(
          <div key={s.l} className="stat">
            <div className="stat-label">{s.l}</div>
            <div className="stat-value" style={{color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="filters">
        {["all","pending","in_progress","resolved","cancelled"].map(f=>(
          <button key={f} className={`fbtn ${filter===f?"on":""}`} onClick={()=>setFilter(f)}>
            {f.replace("_"," ")} {f!=="all" && counts[f]>0 ? `(${counts[f]})` : ""}
          </button>
        ))}
        <button className="fbtn" onClick={load} style={{marginLeft:"auto"}}>⟳ Refresh</button>
      </div>

      {loading ? (
        <div className="empty"><div className="empty-icon">⟳</div>Loading…</div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div>No {filter!=="all"?filter.replace("_"," ")+" ":""} requests yet.</div>
          <div style={{fontSize:11,marginTop:8}}>Submitted forms will appear here.</div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th><th>Category / Issue</th><th>Reporter</th>
                <th>Property</th><th>Description</th><th>Photos</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(req => {
                const sm = STATUS_META[req.status] || STATUS_META.pending;
                return (
                  <tr key={req.id}>
                    <td style={{whiteSpace:"nowrap",color:"var(--muted)",fontSize:11}}>{fmt(req.created_at)}</td>
                    <td><div className="td-issue">{req.issue}</div><div className="td-cat">{req.category}</div></td>
                    <td>
                      <div className="td-name">{req.reporter_name}</div>
                      <div className="td-detail">{req.reporter_email}</div>
                      {req.reporter_phone && <div className="td-detail">{req.reporter_phone}</div>}
                    </td>
                    <td>
                      <div style={{color:"var(--text)",fontSize:12}}>{req.property_address}</div>
                      {req.unit_number && <div className="td-detail">Unit {req.unit_number}</div>}
                    </td>
                    <td style={{maxWidth:180}}>
                      <div style={{color:"var(--muted)",fontSize:11,lineHeight:1.5}}>
                        {req.description?.slice(0,90)}{req.description?.length>90?"…":""}
                      </div>
                    </td>
                    <td>
                      {req.photo_urls?.length > 0 ? (
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {req.photo_urls.map((url,pi) => (
                            <a key={pi} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="" style={{width:40,height:40,objectFit:"cover",border:"1px solid var(--border)",display:"block"}} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{color:"var(--border)",fontSize:11}}>—</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={req.status||"pending"}
                        onChange={e=>changeStatus(req.id,e.target.value)}
                        style={{color:sm.text,borderColor:sm.border,background:sm.bg}}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="setup-box">
        <strong>⚙ Setup Checklist</strong>
        <div className="setup-steps">
          <div className="setup-step">
            <div className="setup-num">1</div>
            <div><strong>Formspree (email):</strong> Go to <a href="https://formspree.io/f/new" target="_blank" rel="noreferrer">formspree.io/f/new</a>, enter <code>admin@beckestates.co.za</code>, copy the form ID and paste it as <code>FORMSPREE_ID</code> in <code>App.jsx</code>.</div>
          </div>
          <div className="setup-step">
            <div className="setup-num">2</div>
            <div><strong>Supabase (database):</strong> Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>, run <code>supabase-schema.sql</code> in the SQL editor, then paste your Project URL and anon key as <code>SUPABASE_URL</code> and <code>SUPABASE_ANON</code>.</div>
          </div>
          <div className="setup-step">
            <div className="setup-num">3</div>
            <div><strong>Logo:</strong> Place <code>logo.png</code> in the <code>/public</code> folder.</div>
          </div>
          <div className="setup-step">
            <div className="setup-num">4</div>
            <div><strong>Deploy:</strong> Run <code>npm run build</code> then drag the <code>dist/</code> folder to <a href="https://netlify.com" target="_blank" rel="noreferrer">Netlify Drop</a> — or connect your repo for auto-deploys.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("report");
  const [adminAuth, setAdminAuth] = useState(
    () => sessionStorage.getItem("beckup_admin") === "1"
  );

  const handleAdminNav = () => setView("admin");
  const handleLogout = () => {
    sessionStorage.removeItem("beckup_admin");
    setAdminAuth(false);
    setView("report");
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">
            <img src={LOGO_URL} alt="Beck-Up" className="nav-logo-img" onError={e => e.target.style.display="none"} />
            <div className="nav-brand-text">
              <span className="nav-brand-top">Beck-Up</span>
              <span className="nav-brand-sub">Maintenance</span>
            </div>
          </div>
          <div className="nav-tabs">
            <button className={`nav-tab ${view === "report" ? "active" : ""}`} onClick={() => setView("report")}>
              Report a Problem
            </button>
            <button className={`nav-tab ${view === "admin" ? "active" : ""}`} onClick={handleAdminNav}>
              Admin
            </button>
            {adminAuth && view === "admin" && (
              <button className="nav-tab" onClick={handleLogout} style={{ color:"var(--gold-d)" }}>
                Log Out
              </button>
            )}
          </div>
        </nav>
        {view === "report" ? (
          <ReportPage />
        ) : adminAuth ? (
          <AdminPage />
        ) : (
          <AdminLogin onLogin={() => setAdminAuth(true)} />
        )}
      </div>
    </>
  );
}
