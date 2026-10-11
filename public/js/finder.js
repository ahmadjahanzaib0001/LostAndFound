/* My Found Items: card grid */
const foundList = document.getElementById("foundList");
if (foundList) {
    api("/items/mine").then(function (items) {
        items = items.filter(function (i) { return i.type === "found"; });
        foundList.innerHTML = items.length
            ? items.map(function (i) { return itemCard(i, { href: "item-details.html?id=" + i._id }); }).join("")
            : '<div class="empty-state">You have not reported any found items yet.</div>';
    }).catch(function (err) { foundList.innerHTML = '<div class="empty-state">' + esc(err.message) + '</div>'; });
}
