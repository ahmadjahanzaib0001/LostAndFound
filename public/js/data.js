/* Colour class for a status label. (No sample data here - everything comes from the database.) */
function statusClass(s) {
    return "status-" + ({ "In Review": "review", "Pending": "pending", "Resolved": "resolved", "Claimed": "claimed", "Found": "claimed",
        "Approved": "approved", "Rejected": "rejected", "Active": "active", "Inactive": "inactive" }[s] || "pending");
}
