/* Inline SVG icon set. Usage: <i data-icon="home"></i> */
(function () {
    const P = {
        home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
        "file-plus": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 12v6M9 15h6"/>',
        list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
        "shield-check": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
        users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.5 0 5 1.2 5 4"/>',
        logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
        box: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
        "search-check": '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11l2 2 4-4"/>',
        eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        "eye-off": '<path d="M3 3l18 18"/><path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.7 8.4 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
        lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
        "map-pin": '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        "file-text": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
        pencil: '<path d="M4 20l1-4L17 4l3 3L8 19z"/><path d="M14 7l3 3"/>',
        trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
        chart: '<path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/>',
        check: '<path d="M5 12l5 5 9-10"/>',
        "check-circle": '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        "chevron-down": '<path d="M6 9l6 6 6-6"/>',
        "chevron-right": '<path d="M9 6l6 6-6 6"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
        x: '<path d="M6 6l12 12M18 6L6 18"/>',
        "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
    };

    const PIN = '<svg class="logo-pin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.5c-4.4 0-8 3.5-8 7.9 0 5.700 8 13.100 8 13.100s8-7.400 8-13.100c0-4.400-3.600-7.900-8-7.900z"/><circle class="hole" cx="12" cy="9.400" r="4.200"/><circle cx="12" cy="9.400" r="2.100" fill="currentColor"/></svg>';

    window.LFIcon = function (name) {
        return '<svg class="icon" viewBox="0 0 24 24">' + (P[name] || "") + '</svg>';
    };
    window.LFPin = PIN;

    window.LFRenderIcons = function (root) {
        (root || document).querySelectorAll("i[data-icon]").forEach(function (el) {
            if (el.dataset.done) return;
            el.innerHTML = window.LFIcon(el.dataset.icon);
            el.dataset.done = "1";
        });
        (root || document).querySelectorAll("i[data-logo]").forEach(function (el) {
            el.outerHTML = PIN;
        });
    };
    window.LFRenderIcons();
})();
