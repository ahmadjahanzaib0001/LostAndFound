/* Campus lists + form widgets. Edit CATEGORIES and LOCATIONS below to match your campus.
   - <select data-categories>            -> filled with the categories ("data-all" adds an "All Categories" option)
   - <div data-location-field>           -> campus location dropdown with an "Other" box; submits as name="location" */
(function () {
    const CATEGORIES = ["Student ID / ID Card", "Mobile Phone", "Laptop / Tablet", "Electronics", "Wallet", "Keys", "Bag",
        "Books & Notes", "Documents", "Water Bottle", "Clothing", "Other"];
    const LOCATIONS = ["Main Library", "Cafeteria / Food Court", "Admin Block", "Lecture Hall / Classroom", "Computer Lab",
        "Department Building", "Auditorium / Seminar Hall", "Mosque / Prayer Area", "Sports Ground / Gym", "Hostel",
        "Parking Area", "Bus Stop / Transport Point", "Main Gate / Security Gate"];
    const OTHER = "Other";

    function escA(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

    /* ---- categories ---- */
    document.querySelectorAll("select[data-categories]").forEach(function (sel) {
        const head = sel.hasAttribute("data-all") ? '<option value="">All Categories</option>' : '<option value="">Select category</option>';
        sel.innerHTML = head + CATEGORIES.map(function (c) { return "<option>" + escA(c) + "</option>"; }).join("");
    });

    /* ---- location widget ---- */
    function buildLocation(box) {
        const req = box.hasAttribute("data-required") ? " required" : "";
        box.classList.add("loc-field");
        box.innerHTML =
            '<select class="form-control" data-loc-select' + req + ' aria-label="Campus location"><option value="">Select a campus location</option>' +
            LOCATIONS.map(function (l) { return "<option>" + escA(l) + "</option>"; }).join("") + "<option>" + OTHER + "</option></select>" +
            '<input class="form-control loc-other" type="text" data-loc-other maxlength="80" placeholder="Which place? e.g. Block C, 2nd floor" hidden>' +
            '<input type="hidden" name="location">';
        const sel = box.querySelector("[data-loc-select]"), other = box.querySelector("[data-loc-other]"), hid = box.querySelector("[name=location]");
        function sync() {
            const isOther = sel.value === OTHER;
            other.hidden = !isOther;
            other.required = isOther && !!req;
            hid.value = isOther ? other.value.trim() : sel.value;
        }
        sel.addEventListener("change", function () { sync(); if (sel.value === OTHER) other.focus(); });
        other.addEventListener("input", sync);
        box._set = function (v) {
            v = String(v || "");
            if (LOCATIONS.indexOf(v) > -1) { sel.value = v; other.value = ""; }
            else if (v) { sel.value = OTHER; other.value = v; }
            else { sel.value = ""; other.value = ""; }
            sync();
        };
        sync();
    }
    document.querySelectorAll("[data-location-field]").forEach(buildLocation);

    /* ---- shared settings from the server (collection point, email domain hint) ---- */
    let cfg = null;
    function loadConfig() {
        if (!cfg) cfg = fetch("/api/config").then(function (r) { return r.json(); }).catch(function () { return {}; });
        return cfg;
    }

    window.LFCampus = {
        categories: CATEGORIES,
        locations: LOCATIONS,
        setLocation: function (box, v) { if (box && box._set) box._set(v); },
        setCategory: function (sel, v) {
            if (v && !Array.prototype.some.call(sel.options, function (o) { return o.value === v || o.text === v; })) sel.add(new Option(v, v));
            sel.value = v;
        },
        config: loadConfig,
    };

    /* data-collection-point / data-collection-hours: fill text from the server settings */
    if (document.querySelector("[data-collection-point],[data-collection-hours]")) {
        loadConfig().then(function (c) {
            document.querySelectorAll("[data-collection-point]").forEach(function (el) { if (c.collectionPoint) el.textContent = c.collectionPoint; });
            document.querySelectorAll("[data-collection-hours]").forEach(function (el) { if (c.collectionHours) el.textContent = c.collectionHours; });
        });
    }
})();
