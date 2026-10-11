/* Find an Item: browse found items (cards), search, category filter, send a claim */
const foundGrid = document.getElementById("foundGrid");
if (foundGrid) {
    const dlg = document.getElementById("claimDialog");
    const form = document.getElementById("claimForm");
    const search = document.querySelector(".find-toolbar .search-box input");
    const cat = document.getElementById("catFilter");
    let items = [], current = null;

    function openClaim(item) {
        current = item;
        document.getElementById("claimTitle").textContent = current.name;
        document.getElementById("claimMeta").textContent = current.category + " \u00b7 " + current.location + " \u00b7 " + fmtDate(current.date);
        document.getElementById("claimImg").innerHTML = current.imageUrl ? '<img src="' + esc(current.imageUrl) + '" alt="">' : LFIcon("box");
        form.reset();
        dlg.showModal();
    }

    function render() {
        const q = search.value.toLowerCase().trim(), k = cat.value;
        const list = items.filter(function (i) {
            return (!k || i.category === k) && (i.name + " " + i.location + " " + i.category).toLowerCase().indexOf(q) > -1;
        });
        foundGrid.innerHTML = list.length
            ? list.map(function (i) { return itemCard(i, { badge: "Found" }); }).join("")
            : '<div class="empty-state">' + (items.length ? "No items match your search." : "No found items to show right now.") + '</div>';
    }

    api("/items/browse").then(function (r) {
        items = r;
        render();
        const requestedId = new URLSearchParams(location.search).get("item");
        const requestedItem = items.find(function (item) { return item._id === requestedId; });
        if (requestedItem) openClaim(requestedItem);
        else if (requestedId) showToast("That item is no longer available to claim.");
    })
        .catch(function (err) { foundGrid.innerHTML = '<div class="empty-state">' + esc(err.message) + '</div>'; });
    search.addEventListener("input", render);
    cat.addEventListener("change", render);

    foundGrid.addEventListener("click", function (e) {
        const b = e.target.closest("[data-view]");
        if (!b) return;
        const item = items.find(function (i) { return i._id === b.closest(".item-card").dataset.id; });
        if (item) openClaim(item);
    });
    document.getElementById("claimCancel").addEventListener("click", function () { dlg.close(); });

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = document.getElementById("claimSubmit");
        const fd = new FormData(form);
        fd.append("itemId", current._id);
        btn.disabled = true; btn.textContent = "Sending...";
        try {
            await api("/claims", { method: "POST", form: fd });
            dlg.close();
            showToast("Claim sent. An admin will review it.");
            setTimeout(function () { location.href = "claims.html"; }, 1100);
        } catch (err) {
            showToast(err.message);
            btn.disabled = false; btn.textContent = "Send Claim";
        }
    });
}
