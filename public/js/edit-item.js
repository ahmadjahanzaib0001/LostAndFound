/* Edit an item you reported */
const editForm = document.getElementById("editForm");
if (editForm) {
    const id = new URLSearchParams(location.search).get("id");
    const field = function (n) { return editForm.querySelector("[name=" + n + "]"); };
    field("date").max = new Date().toISOString().slice(0, 10);

    api("/items/" + id).then(function (item) {
        if (item.status === "Claimed" || item.status === "Resolved") return (location.href = "item-details.html?id=" + id);
        const lost = item.type === "lost";
        const listPage = lost ? "my-lost-items.html" : "my-found-items.html";
        document.getElementById("crumbList").textContent = lost ? "Lost Reports" : "Found Reports";
        document.getElementById("crumbList").href = listPage;
        document.querySelectorAll(".sidebar-nav .nav-link").forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === listPage); });
        document.getElementById("lblLoc").innerHTML = (lost ? "Location Lost" : "Location Found") + ' <span class="req">*</span>';
        document.getElementById("lblDate").innerHTML = (lost ? "Date Lost" : "Date Found") + ' <span class="req">*</span>';
        field("name").value = item.name;
        LFCampus.setCategory(field("category"), item.category);
        LFCampus.setLocation(editForm.querySelector("[data-location-field]"), item.location);
        field("date").value = String(item.date).slice(0, 10);
        field("description").value = item.description;
    }).catch(function () { location.href = "my-lost-items.html"; });

    editForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = document.getElementById("saveBtn");
        btn.disabled = true; btn.textContent = "Saving...";
        try {
            await api("/items/" + id, { method: "PUT", form: new FormData(editForm) });
            showToast("Item updated");
            setTimeout(function () { location.href = "item-details.html?id=" + id; }, 800);
        } catch (err) {
            showToast(err.message);
            btn.disabled = false; btn.textContent = "Save Changes";
        }
    });
}
