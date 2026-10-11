/* Fills the dashboards and reports with real numbers */
(function () {
    const path = location.pathname;
    const nums = function () { return document.querySelectorAll(".stat-card .stat-info h3"); };
    const labels = function () { return document.querySelectorAll(".stat-card .stat-info p"); };
    const setNum = function (i, v) { const el = nums()[i]; if (el) el.textContent = v; };
    const setLabel = function (i, v) { const el = labels()[i]; if (el) el.textContent = v; };

    if (path.endsWith("/user/dashboard.html")) {
        api("/stats/user").then(function (s) {
            setNum(0, s.lost); setNum(1, s.found); setNum(2, s.claimed);
            
            const list = document.querySelector(".recent-list");
            if (list) {
                list.className = "item-grid recent-grid";
                list.innerHTML = s.recent.length
                    ? s.recent.map(function (i) { return itemCard(i, { href: "item-details.html?id=" + i._id, showType: true }); }).join("")
                    : '<div class="empty-state">Nothing here yet. <a href="report-lost.html" style="color:var(--blue)">Report a lost item</a> or <a href="report-found.html" style="color:var(--blue)">a found one</a>.</div>';
            }
        }).catch(function () {});
    }

    if (path.endsWith("/admin/dashboard.html") || path.endsWith("/admin/reports.html")) {
        const reports = path.endsWith("/reports.html");
        api("/stats/admin").then(function (s) {
            setNum(0, s.lost); setNum(1, s.found); setNum(2, s.claimed);
            setNum(3, reports ? s.pendingClaims : s.users);
            const grid = document.querySelector(".stats-grid");
            if (!reports && grid && s.pendingClaims > 0) grid.insertAdjacentHTML("beforebegin",
                '<a class="alert-banner" href="claims.html">' + LFIcon("shield-check") + '<span><strong>' + s.pendingClaims +
                (s.pendingClaims === 1 ? ' claim is' : ' claims are') + '</strong> waiting for your review</span>' + LFIcon("arrow-right") + '</a>');
            if (reports) setLabel(3, "Pending Claims");

            const el = document.getElementById("overviewChart");
            if (el && window.drawBarChart) {
                const m = Math.max.apply(null, s.chart.lost.concat(s.chart.found));
                drawBarChart(el, s.chart.labels, s.chart.lost, s.chart.found, Math.max(4, Math.ceil(m / 2) * 2));
            }
            const cats = document.querySelector(".content-card-body");
            if (reports && cats) cats.innerHTML = s.categories.length ? s.categories.map(function (c) {
                return '<div class="settings-row"><h4>' + esc(c.name) + '</h4><span class="status role-finder">' + c.count + '</span></div>';
            }).join("") : '<div class="empty-state">No items yet.</div>';
        }).catch(function () {});
    }
})();
