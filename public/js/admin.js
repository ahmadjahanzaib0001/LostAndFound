/* Admin pages: items, users, claims */
const CATS = window.LFCampus ? LFCampus.categories : ["Electronics", "Bag", "Wallet", "Keys", "Documents", "Clothing", "Other"];
const ITEM_STATUSES = ["Pending", "In Review", "Claimed", "Resolved"];
const todayStr = function () { return new Date().toISOString().slice(0, 10); };
const byId = function (id) { return document.getElementById(id); };

/* ---- a small form dialog used for Add / Edit ---- */
function adminForm(cfg) {
    const dlg = document.createElement("dialog");
    dlg.className = "admin-dialog";
    const field = function (f) {
        const v = f.value == null ? "" : f.value, req = f.required ? " required" : "";
        let input;
        if (f.type === "select") input = '<select class="form-control" name="' + f.name + '"' + req + '>' + f.options.map(function (o) {
            const val = typeof o === "string" ? o : o.value, lab = typeof o === "string" ? o : o.label;
            return '<option value="' + esc(val) + '"' + (val === v ? " selected" : "") + '>' + esc(lab) + '</option>';
        }).join("") + '</select>';
        else if (f.type === "textarea") input = '<textarea class="form-control" rows="3" name="' + f.name + '"' + req + '>' + esc(v) + '</textarea>';
        else input = '<input class="form-control" type="' + (f.type || "text") + '" name="' + f.name + '" value="' + esc(v) + '"' + req +
            (f.max ? ' max="' + f.max + '"' : '') + (f.accept ? ' accept="' + f.accept + '"' : '') + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '>';
        return '<div class="form-group"' + (f.full ? ' style="grid-column:1/-1"' : '') + '><label class="form-label">' + esc(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>' + input + '</div>';
    };
    dlg.innerHTML = '<form><h2>' + esc(cfg.title) + '</h2><div class="form-grid">' + cfg.fields.map(field).join("") +
        '</div><div class="dialog-actions"><button type="button" class="btn btn-outline" data-x>Cancel</button><button type="submit" class="btn btn-primary">' + esc(cfg.submit) + '</button></div></form>';
    document.body.appendChild(dlg);
    dlg.querySelector("[data-x]").onclick = function () { dlg.close(); };
    dlg.addEventListener("close", function () { dlg.remove(); });
    dlg.querySelector("form").addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = dlg.querySelector("button[type=submit]");
        btn.disabled = true;
        try { await cfg.onSubmit(new FormData(e.target)); dlg.close(); }
        catch (err) { showToast(err.message); btn.disabled = false; }
    });
    dlg.showModal();
}

/* ---- Manage items ---- */
const itemsBody = byId("itemsBody");
if (itemsBody) {
    const requestedType = new URLSearchParams(location.search).get("type");
    let type = ["lost", "found"].includes(requestedType) ? requestedType : "lost", items = [];
    const itemFields = function (i) {
        i = i || {};
        return [
            { name: "name", label: "Item name", value: i.name, required: true },
            { name: "category", label: "Category", type: "select", options: CATS, value: i.category, required: true },
            { name: "location", label: "Location", value: i.location, required: true },
            { name: "date", label: "Date", type: "date", value: i.date ? String(i.date).slice(0, 10) : "", max: todayStr(), required: true },
            { name: "description", label: "Description", type: "textarea", value: i.description, required: true, full: true },
            { name: "image", label: i._id ? "Replace image (optional)" : "Image (optional)", type: "file", accept: "image/*", full: true }
        ];
    };
    function render() {
        const q = byId("itemSearch").value.toLowerCase().trim(), st = byId("itemStatusFilter").value, ct = byId("itemCatFilter").value;
        const list = items.filter(function (i) {
            return (!st || i.status === st) && (!ct || i.category === ct) &&
                (i.name + " " + i.location + " " + i.category + " " + (i.owner ? i.owner.name : "")).toLowerCase().indexOf(q) > -1;
        });
        itemsBody.innerHTML = list.length ? list.map(function (i) {
            return '<tr data-id="' + i._id + '"><td class="id">#' + esc(i._id.slice(-5).toUpperCase()) + '</td><td><div class="cell-item">' + thumbUrl(i.imageUrl) +
                '<div>' + esc(i.name) + '<br><small style="color:var(--muted)">by ' + esc(i.owner ? i.owner.name : "-") + '</small></div></div></td><td>' + esc(i.category) +
                '</td><td>' + esc(i.location) + '</td><td>' + fmtDate(i.date) + '</td><td><span class="status ' + statusClass(i.status) + '">' + esc(i.status) +
                '</span></td><td><div class="table-actions"><button class="icon-btn edit" data-act="edit" title="Edit">' + LFIcon("pencil") +
                '</button><button class="icon-btn delete" data-act="delete" title="Delete">' + LFIcon("trash") + '</button></div></td></tr>';
        }).join("") : '<tr><td colspan="7" class="empty-state">No items found.</td></tr>';
    }
    async function load() {
        itemsBody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading...</td></tr>';
        try { items = await api("/items?type=" + type); render(); }
        catch (err) { itemsBody.innerHTML = '<tr><td colspan="7" class="empty-state">' + esc(err.message) + '</td></tr>'; }
    }
    document.querySelectorAll(".tab-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.tab === type);
        b.addEventListener("click", function () {
            document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.remove("active"); });
            b.classList.add("active"); type = b.dataset.tab; load();
        });
    });
    ["itemSearch", "itemStatusFilter", "itemCatFilter"].forEach(function (id) { byId(id).addEventListener(id === "itemSearch" ? "input" : "change", render); });

    byId("addItemBtn").addEventListener("click", function () {
        adminForm({
            title: "Add item", submit: "Add item",
            fields: [{ name: "type", label: "Type", type: "select", options: [{ value: "lost", label: "Lost item" }, { value: "found", label: "Found item" }], value: type, required: true }].concat(itemFields()),
            onSubmit: async function (fd) { await api("/admin/items", { method: "POST", form: fd }); showToast("Item added"); load(); }
        });
    });
    itemsBody.addEventListener("click", async function (e) {
        const b = e.target.closest("[data-act]");
        if (!b) return;
        const id = b.closest("tr").dataset.id, item = items.find(function (i) { return i._id === id; });
        if (b.dataset.act === "edit") adminForm({
            title: "Edit item", submit: "Save changes",
            fields: itemFields(item).concat([{ name: "status", label: "Status", type: "select", options: ITEM_STATUSES, value: item.status, required: true }]),
            onSubmit: async function (fd) { await api("/admin/items/" + id, { method: "PUT", form: fd }); showToast("Item updated"); load(); }
        });
        else if (await confirmDialog("Delete " + item.name + "? This cannot be undone.")) {
            try { await api("/items/" + id, { method: "DELETE" }); showToast("Item deleted"); load(); } catch (err) { showToast(err.message); }
        }
    });
    load();
}

/* ---- Manage users ---- */
const usersBody = byId("usersBody");
if (usersBody) {
    let users = [];
    function render() {
        const q = byId("userSearch").value.toLowerCase().trim(), role = byId("userRoleFilter").value, st = byId("userStatusFilter").value;
        const list = users.filter(function (u) {
            return (!role || (u.isCore ? "admin" : u.role) === role) && (!st || u.status === st) && (u.name + " " + u.email).toLowerCase().indexOf(q) > -1;
        });
        usersBody.innerHTML = list.length ? list.map(function (u) {
            const label = u.isCore ? "Core Admin" : u.role.charAt(0).toUpperCase() + u.role.slice(1), cls = u.isCore ? "role-core" : "role-" + u.role;
            let actions = "";
            if (u.isCore) actions = '<span class="protected">' + LFIcon("lock") + 'Protected</span>';
            else {
                if (u.canPromote) actions += '<button class="btn btn-outline btn-sm" data-act="promote">Make Admin</button>';
                if (u.canDemote) actions += '<button class="btn btn-outline btn-sm" data-act="demote">Remove Admin</button>';
                if (u.canSuspend) actions += '<button class="btn btn-outline btn-sm" data-act="' + (u.status === "Active" ? "suspend" : "activate") + '">' + (u.status === "Active" ? "Suspend" : "Activate") + '</button>';
                if (u.canDelete) actions += '<button class="icon-btn delete" data-act="delete" title="Delete">' + LFIcon("trash") + '</button>';
            }
            return '<tr data-id="' + u._id + '" data-name="' + esc(u.name) + '"><td class="id">U' + esc(u._id.slice(-4).toUpperCase()) + '</td><td style="color:var(--ink);font-weight:500">' + esc(u.name) +
                (u.isSelf ? ' <span style="color:var(--muted);font-weight:400">(you)</span>' : '') + '</td><td>' + esc(u.email) + '</td><td><span class="status ' + cls + '">' + label +
                '</span></td><td><span class="status ' + statusClass(u.status) + '">' + (u.status === "Inactive" ? "Suspended" : esc(u.status)) + '</span></td><td><div class="table-actions">' + actions + '</div></td></tr>';
        }).join("") : '<tr><td colspan="6" class="empty-state">No users found.</td></tr>';
    }
    async function load() {
        try { users = await api("/users"); render(); }
        catch (err) { usersBody.innerHTML = '<tr><td colspan="6" class="empty-state">' + esc(err.message) + '</td></tr>'; }
    }
    ["userSearch", "userRoleFilter", "userStatusFilter"].forEach(function (id) { byId(id).addEventListener(id === "userSearch" ? "input" : "change", render); });
    byId("addUserBtn").addEventListener("click", function () {
        adminForm({
            title: "Add user", submit: "Create user",
            fields: [
                { name: "name", label: "Full name", required: true },
                { name: "email", label: "Email", type: "email", required: true },
                { name: "password", label: "Password (min 6)", type: "password", required: true },
                { name: "role", label: "Role", type: "select", options: [{ value: "user", label: "User" }, { value: "admin", label: "Admin" }], value: "user" }
            ],
            onSubmit: async function (fd) { await api("/users", { method: "POST", body: { name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), role: fd.get("role") } }); showToast("User created"); load(); }
        });
    });
    usersBody.addEventListener("click", async function (e) {
        const btn = e.target.closest("[data-act]");
        if (!btn) return;
        const row = btn.closest("tr"), id = row.dataset.id, name = row.dataset.name, act = btn.dataset.act;
        try {
            if (act === "promote") { if (!await confirmDialog("Make " + name + " an admin?")) return; await api("/users/" + id + "/role", { method: "PATCH", body: { role: "admin" } }); showToast(name + " is now an admin"); }
            else if (act === "demote") { if (!await confirmDialog("Remove admin rights from " + name + "?")) return; await api("/users/" + id + "/role", { method: "PATCH", body: { role: "user" } }); showToast("Admin rights removed"); }
            else if (act === "suspend") { if (!await confirmDialog("Suspend " + name + "? They will be logged out and cannot log in.", { tone: "danger", icon: "lock", title: "Suspend account", ok: "Suspend" })) return; await api("/users/" + id + "/status", { method: "PATCH", body: { status: "Inactive" } }); showToast(name + " suspended"); }
            else if (act === "activate") { await api("/users/" + id + "/status", { method: "PATCH", body: { status: "Active" } }); showToast(name + " activated"); }
            else if (act === "delete") { if (!await confirmDialog("Delete " + name + "? This cannot be undone.")) return; await api("/users/" + id, { method: "DELETE" }); showToast("User deleted"); }
            load();
        } catch (err) { showToast(err.message); }
    });
    load();
}

/* ---- Claims ---- */
const claimsBody = byId("claimsBody");
if (claimsBody) {
    let claims = [];
    function render() {
        const f = byId("claimFilter").value, list = claims.filter(function (c) { return !f || c.status === f; });
        claimsBody.innerHTML = list.length ? list.map(function (c) {
            const it = c.item || {}, who = c.claimant || {};
            return '<tr data-id="' + c._id + '"><td class="id">C' + esc(c._id.slice(-4).toUpperCase()) + '</td><td><div class="cell-item">' + thumbUrl(it.imageUrl) +
                '<div>' + esc(it.name || "(item removed)") + (it.description ? '<br><small style="color:var(--muted)" title="Real description (only admins see this)">Real: ' + esc(it.description.slice(0, 70)) + '</small>' : '') + '</div></div></td>' +
                '<td>' + esc(who.name || "-") + '<br><small style="color:var(--muted)">' + esc(who.email || "") + '</small></td><td style="max-width:260px">' + esc(c.message) +
                (c.imageUrl ? ' <a href="' + esc(c.imageUrl) + '" target="_blank" rel="noopener" style="color:var(--blue)">photo</a>' : '') + '</td><td>' + fmtDate(c.createdAt) +
                '</td><td><span class="status ' + statusClass(c.status) + '">' + esc(c.status) + '</span></td><td>' +
                (c.status === "Pending" ? '<div class="claim-actions"><button class="btn btn-sm btn-approve" data-a="Approved">Approve</button><button class="btn btn-sm btn-reject" data-a="Rejected">Reject</button></div>' : '<span style="color:var(--muted)">-</span>') + '</td></tr>';
        }).join("") : '<tr><td colspan="7" class="empty-state">No claims found.</td></tr>';
    }
    async function load() {
        try { claims = await api("/claims"); render(); }
        catch (err) { claimsBody.innerHTML = '<tr><td colspan="7" class="empty-state">' + esc(err.message) + '</td></tr>'; }
    }
    byId("claimFilter").addEventListener("change", render);
    claimsBody.addEventListener("click", async function (e) {
        const b = e.target.closest("button[data-a]");
        if (!b) return;
        if (b.dataset.a === "Approved" && !await confirmDialog("Approve this claim? The item will be marked as Claimed.")) return;
        try { await api("/claims/" + b.closest("tr").dataset.id, { method: "PATCH", body: { status: b.dataset.a } }); showToast("Claim " + b.dataset.a.toLowerCase()); load(); }
        catch (err) { showToast(err.message); }
    });
    load();
}

/* ---- Bar chart (SVG) ---- */
function drawBarChart(el, labels, a, b, max) {
    const W = 560, H = 250, L = 34, B = 30, T = 10, R = 10;
    const cw = W - L - R, ch = H - T - B, step = cw / labels.length, bw = 15;
    let s = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Items overview">';
    for (let v = 0; v <= max; v += 2) {
        const y = T + ch - (v / max) * ch;
        s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#e8edf5"/>' +
             '<text x="' + (L - 10) + '" y="' + (y + 4) + '" font-size="11" fill="#66768F" text-anchor="end">' + v + '</text>';
    }
    labels.forEach(function (lb, i) {
        const cx = L + step * i + step / 2;
        const h1 = (a[i] / max) * ch, h2 = (b[i] / max) * ch;
        s += '<rect x="' + (cx - bw - 1) + '" y="' + (T + ch - h1) + '" width="' + bw + '" height="' + h1 + '" rx="3" fill="#2B55E6" style="--i:' + i + '"/>' +
             '<rect x="' + (cx + 1) + '" y="' + (T + ch - h2) + '" width="' + bw + '" height="' + h2 + '" rx="3" fill="#12805C" style="--i:' + i + '"/>' +
             '<text x="' + cx + '" y="' + (H - 9) + '" font-size="11" fill="#66768F" text-anchor="middle">' + lb + '</text>';
    });
    el.innerHTML = s + '</svg>';
}
/* chart data now comes from dashboard.js */
