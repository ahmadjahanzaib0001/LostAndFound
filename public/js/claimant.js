/* Claimant pages: my lost items list, item details, claimed items */

const lostList = document.getElementById("lostList");
if (lostList) {
    api("/items/mine").then(function (items) {
        items = items.filter(function (i) { return i.type === "lost"; });
        lostList.innerHTML = items.length
            ? items.map(function (i) { return itemCard(i, { href: "item-details.html?id=" + i._id }); }).join("")
            : '<div class="empty-state">You have not reported any lost items yet.</div>';
    }).catch(function (err) { lostList.innerHTML = '<div class="empty-state">' + esc(err.message) + '</div>'; });
}

const detail = document.getElementById("itemDetail");
if (detail) {
    const id = new URLSearchParams(location.search).get("id");
    const el = function (x) { return document.getElementById(x); };
    const info = function (i) {
        if (i.status === "Resolved") return "This item is marked as resolved.";
        if (i.status === "Claimed") return "This item was claimed by its owner. Thank you!";
        return i.type === "lost"
            ? "Check the possible matches below, or wait for an admin to contact you when your item is found."
            : "An admin will review any claims on this item. You will be told the result by email.";
    };
    api("/items/" + id).then(function (item) {
        const lost = item.type === "lost", open = item.status !== "Claimed" && item.status !== "Resolved";
        const list = lost ? "my-lost-items.html" : "my-found-items.html";
        el("crumbList").textContent = lost ? "Lost Reports" : "Found Reports";
        el("crumbList").href = list; el("btnBack").href = list;
        document.querySelectorAll(".sidebar-nav .nav-link").forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === list); });
        el("detailImg").parentNode.style.display = item.imageUrl ? "" : "none";
        if (item.imageUrl) el("detailImg").src = item.imageUrl;
        el("detailName").textContent = item.name;
        el("detailStatus").textContent = item.status; el("detailStatus").className = "status " + statusClass(item.status);
        el("detailCategory").textContent = item.category;
        el("detailDateLabel").textContent = lost ? "Date Lost" : "Date Found";
        el("detailDate").textContent = fmtDate(item.date);
        el("detailLoc").textContent = item.location;
        el("detailDesc").textContent = item.description;
        el("statusInfo").textContent = info(item);
        el("btnEdit").hidden = !open; el("btnEdit").href = "edit-item.html?id=" + item._id;
        el("btnResolve").hidden = !(lost && open);
        el("btnDelete").hidden = item.status === "Claimed";
        if (lost && open) api("/items/" + id + "/matches").then(function (matches) {
            if (!matches.length) return;
            el("matchesSection").hidden = false;
            el("matchGrid").innerHTML = matches.map(function (m) { return itemCard(m, { badge: "Found", href: "browse-found.html" }); }).join("");
        }).catch(function () {});
        el("btnResolve").onclick = async function () {
            if (!await confirmDialog("Mark this item as found? It will be closed.")) return;
            try { await api("/items/" + id + "/resolve", { method: "PATCH" }); showToast("Marked as found"); setTimeout(function () { location.reload(); }, 700); }
            catch (err) { showToast(err.message); }
        };
        el("btnDelete").onclick = async function () {
            if (!await confirmDialog("Delete this item? This cannot be undone.")) return;
            try { await api("/items/" + id, { method: "DELETE" }); showToast("Item deleted"); setTimeout(function () { location.href = list; }, 700); }
            catch (err) { showToast(err.message); }
        };
    }).catch(function () { location.href = "my-lost-items.html"; });
}

const claimedBody = document.getElementById("claimedBody");
if (claimedBody) {
    function loadClaims() {
        api("/claims/mine").then(function (claims) {
            claimedBody.innerHTML = claims.length ? claims.map(function (c) {
                const it = c.item || {};
                return '<tr data-id="' + c._id + '"><td class="id">C' + esc(c._id.slice(-4).toUpperCase()) + '</td><td><div class="cell-item">' + thumbUrl(it.imageUrl) +
                    esc(it.name || "(item removed)") + '</div></td><td>' + esc(it.location || "-") + '</td><td>' + fmtDate(c.createdAt) +
                    '</td><td><span class="status ' + statusClass(c.status) + '">' + esc(c.status) + '</span></td><td>' +
                    (c.status === "Pending" ? '<button class="btn btn-outline btn-sm" data-cancel>Cancel</button>' : '<span style="color:var(--muted)">-</span>') + '</td></tr>';
            }).join("") : '<tr><td colspan="6" class="empty-state">No claims yet. <a href="browse-found.html" style="color:var(--blue)">Browse found items</a></td></tr>';
        }).catch(function (err) { claimedBody.innerHTML = '<tr><td colspan="6" class="empty-state">' + esc(err.message) + '</td></tr>'; });
    }
    claimedBody.addEventListener("click", async function (e) {
        const b = e.target.closest("[data-cancel]");
        if (!b || !await confirmDialog("Cancel this claim?")) return;
        try { await api("/claims/" + b.closest("tr").dataset.id, { method: "DELETE" }); showToast("Claim cancelled"); loadClaims(); }
        catch (err) { showToast(err.message); }
    });
    loadClaims();
}
