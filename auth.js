// auth.js — gestion de session partagée entre toutes les pages de Pilotage Atelier
const SUPABASE_URL = "https://dbxhmneliwhiwmzduahb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGhtbmVsaXdoaXdtemR1YWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Njg2MjYsImV4cCI6MjEwMTQ0NDYyNn0.zOecIGcm2vdqWCCFJ8FKq08_IwjzCEdy7MNdKv9SvS8";
const AUTH_DOMAIN = "pilotage-atelier.local";
const SESSION_KEY = "pilotage_session";
const REST = SUPABASE_URL + "/rest/v1";

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}

function requireAuth() {
  const s = getSession();
  if (!s) { window.location.href = "login.html"; return null; }
  return s;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

function getAuthHeaders() {
  const s = getSession();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: "Bearer " + (s ? s.access_token : SUPABASE_ANON_KEY),
    "Content-Type": "application/json",
  };
}

async function refreshSession() {
  const s = getSession();
  if (!s || !s.refresh_token) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, s, { access_token: data.access_token, refresh_token: data.refresh_token })));
    return true;
  } catch (err) { return false; }
}

// Enrobe fetch : si le jeton a expiré (401), tente un rafraîchissement automatique une fois avant d'abandonner.
async function apiFetch(url, options) {
  options = options || {};
  let res = await fetch(url, options);
  if (res.status === 401) {
    const ok = await refreshSession();
    if (ok) {
      const newHeaders = Object.assign({}, options.headers || {}, getAuthHeaders());
      res = await fetch(url, Object.assign({}, options, { headers: newHeaders }));
    } else {
      logout();
    }
  }
  return res;
}

function isAdmin() { const s = getSession(); return !!s && s.role === "Admin"; }
function canDelete() { return isAdmin(); }
function currentRole() { const s = getSession(); return s ? s.role : null; }

function renderUserBadge(elId) {
  const s = getSession();
  const el = document.getElementById(elId);
  if (!el || !s) return;
  el.innerHTML = `👤 ${s.nom || s.username} <span style="opacity:0.6;">(${s.role})</span> · <a href="#" id="btn-logout" style="color:#e08a8a; text-decoration:none;">déconnexion</a>`;
  const logoutLink = document.getElementById("btn-logout");
  if (logoutLink) logoutLink.addEventListener("click", (e) => { e.preventDefault(); logout(); });
}
