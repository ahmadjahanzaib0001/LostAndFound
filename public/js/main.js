/* Shared behaviour: mobile menu, password toggle, toast, demo form submit */

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");

if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        sidebar.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
        if (sidebar.classList.contains("open") && !sidebar.contains(e.target)) sidebar.classList.remove("open");
    });
}

/* Landing nav toggle */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
if (navToggle && navLinks) navToggle.addEventListener("click", function () { navLinks.classList.toggle("open"); });

if (navLinks) {
    const sectionLinks = Array.from(navLinks.querySelectorAll('a[href^="#"]'))
        .map(function (link) { return { link: link, section: document.querySelector(link.getAttribute("href")) }; })
        .filter(function (entry) { return entry.section; });
    let navUpdatePending = false;

    function updateActiveNavLink() {
        const activationLine = Math.max(
            (document.getElementById("nav")?.offsetHeight || 0) + 40,
            window.innerHeight * 0.55
        );
        let activeLink = sectionLinks[0]?.link;

        sectionLinks.forEach(function (entry) {
            if (entry.section.getBoundingClientRect().top <= activationLine) activeLink = entry.link;
        });

        sectionLinks.forEach(function (entry) {
            const isActive = entry.link === activeLink;
            entry.link.classList.toggle("active", isActive);
            if (isActive) entry.link.setAttribute("aria-current", "location");
            else entry.link.removeAttribute("aria-current");
        });

        navUpdatePending = false;
    }

    function scheduleActiveNavUpdate() {
        if (navUpdatePending) return;
        navUpdatePending = true;
        requestAnimationFrame(updateActiveNavLink);
    }

    window.addEventListener("scroll", scheduleActiveNavUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveNavUpdate);
    updateActiveNavLink();
}

/* Password show/hide */
document.querySelectorAll(".toggle-pass").forEach(function (btn) {
    btn.addEventListener("click", function () {
        const input = btn.parentElement.querySelector("input");
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.innerHTML = LFIcon(show ? "eye-off" : "eye");
    });
});

/* Toast */
function showToast(message) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.innerHTML = LFIcon("check-circle") + "<span>" + message + "</span>";
    requestAnimationFrame(function () { t.classList.add("show"); });
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, 2200);
}

/* Demo forms: <form data-demo="Message" data-redirect="page.html"> */
document.querySelectorAll("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        showToast(form.dataset.demo);
        if (form.dataset.redirect) setTimeout(function () { location.href = form.dataset.redirect; }, 1000);
    });
});

/* Generic table/list search: <input data-filter="#selector"> */
document.querySelectorAll("input[data-filter]").forEach(function (input) {
    input.addEventListener("input", function () {
        const q = input.value.toLowerCase();
        document.querySelectorAll(input.dataset.filter).forEach(function (row) {
            row.style.display = row.textContent.toLowerCase().indexOf(q) > -1 ? "" : "none";
        });
    });
});

/* ================= API + helpers ================= */
async function api(url, { method = "GET", body, form } = {}) {
    const opts = { method, headers: {}, credentials: "same-origin" };
    if (form) opts.body = form;                       // FormData (file upload)
    else if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    const res = await fetch("/api" + url, opts);
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) { /* session expired */ if (res.status === 401 && /\/pages\/(user|admin)\//.test(location.pathname)) location.href = loginUrl(); const err = new Error(data.message || "Something went wrong"); err.status = res.status; throw err; }
    return data;
}

function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}
function fmtDate(d) {
    const x = new Date(d);
    return String(x.getUTCDate()).padStart(2, "0") + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][x.getUTCMonth()] + " " + x.getUTCFullYear();
}
function thumbUrl(url) {
    return '<div class="item-image">' + (url ? '<img src="' + esc(url) + '" alt="">' : LFIcon("box")) + '</div>';
}

function loginUrl() {
    const path = location.pathname;
    const next = /^\/pages\/user\/[a-z-]+\.html$/.test(path) ? path + location.search : "";
    return "/pages/login.html" + (next ? "?next=" + encodeURIComponent(next) : "");
}

window.addEventListener("pageshow", function (event) {
    if (event.persisted && (document.body.classList.contains("theme-user") || document.body.classList.contains("theme-admin"))) {
        location.reload();
    }
});

/* ================= Page guard: only logged-in users of the right role ================= */
(async function guard() {
    const m = document.body.className.match(/theme-(user|admin)/);
    if (!m) return;                                   // landing/login/register pages
    try {
        const { user } = await api("/auth/me");
        if (user.role !== m[1]) return (location.href = "/pages/" + user.role + "/dashboard.html");
        document.querySelectorAll(".user-name").forEach(function (el) { el.textContent = user.name; });
        const s = document.querySelector(".sidebar-user strong");
        if (s) s.textContent = user.name;
        if (user.avatarUrl) document.querySelectorAll(".user-profile img, .sidebar-user img, #profileAvatar").forEach(function (i) { i.src = user.avatarUrl; });
        const rm = document.getElementById("avatarRemove"); if (rm) rm.hidden = !user.avatarUrl;
        window.LF_USER = user;
        document.body.classList.add("user-ready");
        document.querySelectorAll("[data-fill]").forEach(function (el) {
            const v = user[el.dataset.fill] || "";
            if (el.tagName === "INPUT") el.value = v; else el.textContent = v;
        });
        const h = document.querySelector(".page-header h1");
        if (h && h.textContent.indexOf("Welcome") === 0) h.textContent = "Welcome, " + user.name + " 👋";
    } catch (e) {
        location.href = loginUrl();
    }
})();

/* ================= Real logout ================= */
document.querySelectorAll(".sidebar-bottom [data-logout]").forEach(function (a) {
    a.addEventListener("click", async function (e) {
        e.preventDefault();
        a.disabled = true;
        try {
            await api("/auth/logout", { method: "POST" });
            location.replace("/index.html");
        } catch (err) {
            if (err.status === 401) return location.replace("/index.html");
            showToast("Could not log out. Please try again.");
            a.disabled = false;
        }
    });
});

/* ================= Report Lost / Found form -> API (with image upload) ================= */
const itemForm = document.getElementById("itemForm");
if (itemForm) {
    // give the fields their names (order: name, category, location, date, description, image)
    ["name", "category", "location", "date", "description", "image"].forEach(function (n, i) {
        const el = itemForm.querySelectorAll("input:not([data-loc-other]), select:not([data-loc-select]), textarea")[i];
        if (el) el.name = n;
    });
    const dateEl = itemForm.querySelector("[name=date]");
    if (dateEl) dateEl.max = new Date().toISOString().slice(0, 10);
    itemForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = itemForm.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Submitting...";
        try {
            const fd = new FormData(itemForm);
            fd.append("type", itemForm.dataset.type);
            await api("/items", { method: "POST", form: fd });
            showToast("Item submitted successfully");
            setTimeout(function () { location.href = itemForm.dataset.redirect; }, 900);
        } catch (err) {
            showToast(err.message);
            btn.disabled = false; btn.textContent = "Submit";
        }
    });
}

/* ================= Modern confirmation dialog =================
   Usage:  if (!await confirmDialog("Delete this item?")) return;
   The title, icon and button text are picked from the start of the message. */
function confirmDialog(message, opts) {
    const m = String(message);
    let d = { tone: "primary", icon: "info", title: "Are you sure?", ok: "Confirm", cancel: "Cancel" };
    if (/^delete/i.test(m)) d = Object.assign(d, { tone: "danger", icon: "trash", title: "Delete", ok: "Delete" });
    else if (/^remove admin/i.test(m)) d = Object.assign(d, { tone: "danger", icon: "x", title: "Remove admin rights", ok: "Remove" });
    else if (/^cancel this claim/i.test(m)) d = Object.assign(d, { tone: "danger", icon: "x", title: "Cancel claim", ok: "Yes, cancel it", cancel: "Keep it" });
    else if (/^approve/i.test(m)) d = Object.assign(d, { icon: "check-circle", title: "Approve claim", ok: "Approve" });
    else if (/^make .* an admin\?$/i.test(m)) d = Object.assign(d, { icon: "shield-check", title: "Make admin", ok: "Make admin" });
    else if (/^mark this item as found/i.test(m)) d = Object.assign(d, { icon: "check-circle", title: "Mark as found", ok: "Mark as found" });
    d = Object.assign(d, opts || {});

    return new Promise(function (resolve) {
        const prev = document.activeElement;
        const wrap = document.createElement("div");
        wrap.className = "cd-overlay";
        wrap.innerHTML = '<div class="cd-box" role="alertdialog" aria-modal="true" aria-labelledby="cdTitle" aria-describedby="cdMsg">' +
            '<div class="cd-icon ' + d.tone + '">' + LFIcon(d.icon) + '</div>' +
            '<h3 class="cd-title" id="cdTitle">' + esc(d.title) + '</h3>' +
            '<p class="cd-msg" id="cdMsg">' + esc(m) + '</p>' +
            '<div class="cd-actions"><button type="button" class="btn btn-outline cd-cancel">' + esc(d.cancel) + '</button>' +
            '<button type="button" class="btn cd-ok ' + d.tone + '">' + esc(d.ok) + '</button></div></div>';
        document.body.appendChild(wrap);
        document.body.classList.add("cd-open");
        requestAnimationFrame(function () { wrap.classList.add("show"); });

        const okBtn = wrap.querySelector(".cd-ok"), cancelBtn = wrap.querySelector(".cd-cancel");
        okBtn.focus();

        function finish(value) {
            document.removeEventListener("keydown", onKey);
            wrap.classList.remove("show");
            document.body.classList.remove("cd-open");
            setTimeout(function () { wrap.remove(); }, 180);
            if (prev && prev.focus) prev.focus();
            resolve(value);
        }
        function onKey(e) {
            if (e.key === "Escape") finish(false);
            if (e.key === "Tab") {            /* keep keyboard focus inside the dialog */
                e.preventDefault();
                (document.activeElement === okBtn ? cancelBtn : okBtn).focus();
            }
        }
        document.addEventListener("keydown", onKey);
        wrap.addEventListener("click", function (e) { if (e.target === wrap) finish(false); });
        cancelBtn.onclick = function () { finish(false); };
        okBtn.onclick = function () { finish(true); };
    });
}

/* ================= Item card (same look everywhere) =================
   itemCard(item, { badge: "Found", href: "item-details.html?id=..." })
   - badge defaults to the item's status; with no href the button gets data-view (the page handles the click) */
function itemCard(i, o) {
    o = o || {};
    const badge = o.badge || i.status || "";
    const view = 'View ' + LFIcon("arrow-right");
    return '<div class="item-card" data-id="' + esc(i._id) + '" data-name="' + esc(i.name) + '" data-cat="' + esc(i.category || "") + '">' +
        '<div class="item-card-img">' + (i.imageUrl ? '<img src="' + esc(i.imageUrl) + '" alt="">' : LFIcon("box")) +
        (badge ? '<span class="status badge ' + statusClass(badge) + '">' + esc(badge) + '</span>' : '') +
        (o.showType && i.type ? '<span class="type-chip type-' + esc(i.type) + '">' + (i.type === "lost" ? "Lost" : "Found") + '</span>' : '') + '</div>' +
        '<h4>' + esc(i.name) + '</h4>' +
        '<p class="meta">' + LFIcon("map-pin") + esc(i.location) + '</p>' +
        '<p class="meta">' + LFIcon("calendar") + fmtDate(i.date) + '</p>' +
        (o.href ? '<a class="btn btn-blue btn-view" href="' + esc(o.href) + '">' + view + '</a>'
                : '<button type="button" class="btn btn-blue btn-view" data-view>' + view + '</button>') + '</div>';
}

/* ================= Account menu (top-right) ================= */
(function () {
    const topbar = document.querySelector(".topbar"), chip = topbar && topbar.querySelector(".user-profile");
    if (!chip) return;
    const admin = document.body.classList.contains("theme-admin");
    const menu = document.createElement("div");
    menu.className = "user-menu";
    menu.setAttribute("role", "menu");
    topbar.appendChild(menu);
    chip.setAttribute("role", "button");
    chip.setAttribute("aria-haspopup", "menu");
    chip.setAttribute("aria-expanded", "false");
    chip.tabIndex = 0;

    function build() {
        const u = window.LF_USER || {};
        const name = (topbar.querySelector(".user-name") || {}).textContent || u.name || "";
        const role = (topbar.querySelector(".user-role") || {}).textContent || "";
        const img = (chip.querySelector("img") || {}).src || "";
        return '<div class="um-head"><img src="' + esc(img) + '" alt=""><div><strong>' + esc(name) + '</strong><span>' + esc(u.email || role) + '</span></div></div>' +
            '<div class="um-sep"></div>' +
            '<a role="menuitem" class="um-item" href="' + (admin ? "settings.html" : "profile.html") + '">' + LFIcon("user") + (admin ? "Account settings" : "My profile") + '</a>' +
            (admin ? '<a role="menuitem" class="um-item" href="settings.html#twoFaCard">' + LFIcon("shield-check") + 'Two-factor security</a>' : '') +
            '<div class="um-sep"></div>' +
            '<button type="button" role="menuitem" class="um-item um-danger" data-logout>' + LFIcon("logout") + 'Log out</button>';
    }
    const isOpen = function () { return menu.classList.contains("open"); };
    function setOpen(open, focusFirst) {
        if (open) menu.innerHTML = build();
        menu.classList.toggle("open", open);
        chip.setAttribute("aria-expanded", String(open));
        if (open && focusFirst) { const f = menu.querySelector(".um-item"); if (f) f.focus(); }
    }

    chip.addEventListener("click", function () { setOpen(!isOpen()); });
    chip.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!isOpen(), true); }
        if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true, true); }
    });
    document.addEventListener("click", function (e) { if (isOpen() && !menu.contains(e.target) && !chip.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) {
        if (!isOpen()) return;
        if (e.key === "Escape") { setOpen(false); chip.focus(); }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            const list = Array.prototype.slice.call(menu.querySelectorAll(".um-item")), i = list.indexOf(document.activeElement);
            e.preventDefault();
            list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus();
        }
    });
    menu.addEventListener("click", function (e) {
        if (!e.target.closest("[data-logout]")) return;
        setOpen(false);
        const out = document.querySelector(".sidebar-bottom [data-logout]");   /* same logout as the sidebar button */
        if (out) out.click();
    });
})();
window.addEventListener("scroll", () => {
    const nav = document.getElementById("nav");
    if (window.scrollY > 20) {
        nav.classList.add("scrolled");
    } else {
        nav.classList.remove("scrolled");
    }
});