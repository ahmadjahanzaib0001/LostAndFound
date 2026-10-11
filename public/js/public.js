/* Public (no login) found-items list: landing page preview + pages/found-items.html */
(function () {
    function card(i) {
        const next = "/pages/user/browse-found.html?item=" + encodeURIComponent(i._id);
        const signUp = "/pages/register.html?next=" + encodeURIComponent(next);
        return '<article class="pub-card">' +
            '<div class="pub-img">' + (i.imageUrl ? '<img src="' + esc(i.imageUrl) + '" alt="" loading="lazy">' : LFIcon("box")) + '</div>' +
            '<span class="pub-cat">' + esc(i.category) + '</span>' +
            '<h3>' + esc(i.name) + '</h3>' +
            '<p class="pub-meta">' + LFIcon("map-pin") + esc(i.location) + '</p>' +
            '<p class="pub-meta">' + LFIcon("calendar") + 'Found ' + fmtDate(i.date) + '</p>' +
            '<a class="btn btn-outline btn-sm pub-claim" href="' + esc(signUp) + '">Sign up to claim ' + LFIcon("arrow-right") + '</a></article>';
    }

    /* landing page: latest 4 */
    const recent = document.getElementById("recentFound");
    if (recent) {
        fetch("/api/items/public?limit=4").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (items) {
            recent.innerHTML = items.length ? items.map(card).join("")
                : '<div class="pub-empty">' + LFIcon("check-circle") + '<p>No items are waiting right now. Lost something? <a href="pages/register.html?next=%2Fpages%2Fuser%2Freport-lost.html">Report it</a> and your report will show possible matches later.</p></div>';
        }).catch(function () {
            recent.innerHTML = '<div class="pub-empty"><p>Found items could not be loaded right now. Please try again in a moment.</p></div>';
        });
    }

    /* found-items page: search + category filter */
    const grid = document.getElementById("pubGrid");
    if (grid) {
        const search = document.getElementById("pubSearch"), cat = document.getElementById("pubCat"), count = document.getElementById("pubCount");
        let items = [];
        function render() {
            const q = search.value.toLowerCase().trim(), k = cat.value;
            const list = items.filter(function (i) {
                return (!k || i.category === k) && (i.name + " " + i.location + " " + i.category).toLowerCase().indexOf(q) > -1;
            });
            count.textContent = list.length + (list.length === 1 ? " item" : " items");
            grid.innerHTML = list.length ? list.map(card).join("")
                : '<div class="pub-empty">' + LFIcon("search") + '<p>' + (items.length ? "No items match your search." : "No found items to show right now.") + '</p></div>';
        }
        fetch("/api/items/public?limit=100").then(function (r) { if (!r.ok) throw 0; return r.json(); })
            .then(function (r) { items = r; render(); })
            .catch(function () { grid.innerHTML = '<div class="pub-empty"><p>Found items could not be loaded right now. Please try again in a moment.</p></div>'; });
        search.addEventListener("input", render);
        cat.addEventListener("change", render);
    }
})();
