/* Shared user/admin dashboard chrome. Pages keep only their content; this fills sidebar + topbar. */
(function () {
    const admin = document.body.classList.contains("theme-admin");
    const user = document.body.classList.contains("theme-user");
    if (!admin && !user) return;

    const layout = document.querySelector(".dashboard-layout");
    const main = layout && layout.querySelector(".dashboard-main");
    if (!layout || !main) return;

    const icon = function (name) { return window.LFIcon ? LFIcon(name) : ""; };
    const pin = window.LFPin || "";
    const page = (location.pathname.split("/").pop() || "dashboard.html").split("?")[0];
    const related = { "item-details.html": "my-lost-items.html", "edit-item.html": "my-lost-items.html" };
    const activeHref = related[page] || page;
    const context = (document.title.split(" - ")[0] || "Dashboard").replace(/\s+/g, " ").trim();
    const avatar = admin ? "/assets/img/avatar-admin.svg" : "/assets/img/avatar-ahmed.svg";
    const roleLabel = admin ? "Administrator" : "Member";

    const userNav = [
        { href: "dashboard.html", icon: "home", label: "Dashboard" },
        "Report",
        { href: "report-lost.html", icon: "file-plus", label: "Report Lost" },
        { href: "report-found.html", icon: "search-check", label: "Report Found" },
        "Find",
        { href: "browse-found.html", icon: "search", label: "Browse Found" },
        "My activity",
        { href: "my-lost-items.html", icon: "list", label: "Lost Reports" },
        { href: "my-found-items.html", icon: "box", label: "Found Reports" },
        { href: "claims.html", icon: "shield-check", label: "My Claims" },
        "Account",
        { href: "profile.html", icon: "user", label: "Profile" }
    ];
    const adminNav = [
        "Overview",
        { href: "dashboard.html", icon: "home", label: "Dashboard" },
        { href: "reports.html", icon: "chart", label: "Reports" },
        "Operations",
        { href: "manage-items.html", icon: "box", label: "Manage Items" },
        { href: "manage-users.html", icon: "users", label: "Manage Users" },
        { href: "claims.html", icon: "shield-check", label: "Claims" },
        "Account",
        { href: "settings.html", icon: "settings", label: "Settings" }
    ];

    function navHtml(items) {
        return items.map(function (item) {
            if (typeof item === "string") return '<p class="nav-section">' + item + "</p>";
            const on = item.href === activeHref;
            return '<a href="' + item.href + '" class="nav-link' + (on ? " active" : "") + '"' +
                (on ? ' aria-current="page"' : "") + ">" + icon(item.icon) + "<span>" + item.label + "</span></a>";
        }).join("");
    }

    const leftoverAside = layout.querySelector("aside.sidebar");
    const leftoverTop = main.querySelector("header.topbar");
    if (leftoverAside) leftoverAside.remove();
    if (leftoverTop) leftoverTop.remove();

    const aside = document.createElement("aside");
    aside.className = "sidebar";
    aside.id = "sidebar";
    aside.setAttribute("aria-label", admin ? "Admin" : "Account");
    aside.innerHTML =
        '<div class="sidebar-head">' +
            '<a href="dashboard.html" class="sidebar-logo">' + pin +
                '<span class="logo-text"><small>Campus</small>Lost &amp; Found</span></a>' +
            '<button type="button" class="sidebar-close" id="sidebarClose" aria-label="Close menu">' + icon("x") + "</button>" +
        "</div>" +
        '<div class="sidebar-user">' +
            '<img src="' + avatar + '" alt="">' +
            "<div><strong></strong><span>" + roleLabel + "</span></div>" +
        "</div>" +
        '<nav class="sidebar-nav" aria-label="Main">' + navHtml(admin ? adminNav : userNav) + "</nav>" +
        '<div class="sidebar-bottom">' +
            '<button type="button" class="nav-link" data-logout>' + icon("logout") + "<span>Log out</span></button>" +
        "</div>";

    const header = document.createElement("header");
    header.className = "topbar";
    header.innerHTML =
        '<div class="topbar-left">' +
            '<button class="mobile-menu-btn" id="mobileMenuBtn" type="button" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">' +
                icon("menu") + "</button>" +
            '<p class="topbar-context">' + context + "</p>" +
        "</div>" +
        '<div class="user-profile">' +
            '<img src="' + avatar + '" alt="">' +
            '<div class="user-info"><span class="user-name"></span><span class="user-role">' + roleLabel + "</span></div>" +
            icon("chevron-down") +
        "</div>";

    layout.insertBefore(aside, main);
    main.insertBefore(header, main.firstChild);

    window.LFSetActiveNav = function (href) {
        aside.querySelectorAll(".sidebar-nav .nav-link").forEach(function (a) {
            const on = a.getAttribute("href") === href;
            a.classList.toggle("active", on);
            if (on) a.setAttribute("aria-current", "page");
            else a.removeAttribute("aria-current");
        });
    };

    const menuBtn = document.getElementById("mobileMenuBtn");
    const closeBtn = document.getElementById("sidebarClose");
    function setOpen(open) {
        aside.classList.toggle("open", open);
        layout.classList.toggle("nav-open", open);
        if (menuBtn) menuBtn.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("nav-open", open);
    }
    if (menuBtn) menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(!aside.classList.contains("open"));
    });
    if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
    aside.querySelectorAll(".sidebar-nav a").forEach(function (a) {
        a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("click", function (e) {
        if (!aside.classList.contains("open")) return;
        if (aside.contains(e.target) || (menuBtn && menuBtn.contains(e.target))) return;
        setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && aside.classList.contains("open")) {
            setOpen(false);
            if (menuBtn) menuBtn.focus();
        }
    });
})();
