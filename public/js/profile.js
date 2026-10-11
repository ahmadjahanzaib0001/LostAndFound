/* Profile + change password */
const profileForm = document.getElementById("profileForm");
if (profileForm) {
    profileForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = profileForm.querySelector("button[type=submit]");
        const name = profileForm.querySelector("[name=name]").value.trim();
        btn.disabled = true;
        try {
            await api("/profile", { method: "PUT", body: { name: name, phone: profileForm.querySelector("[name=phone]").value } });
            document.querySelectorAll(".user-name, .sidebar-user strong, .profile-head h2").forEach(function (el) { el.textContent = name; });
            showToast("Profile updated");
        } catch (err) { showToast(err.message); }
        btn.disabled = false;
    });
}

const passwordForm = document.getElementById("passwordForm");
if (passwordForm) {
    passwordForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const f = function (n) { return passwordForm.querySelector("[name=" + n + "]"); };
        if (f("newPassword").value !== f("confirmPassword").value) return showToast("New passwords do not match.");
        const btn = passwordForm.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
            await api("/profile/password", { method: "PUT", body: { currentPassword: f("currentPassword").value, newPassword: f("newPassword").value } });
            passwordForm.reset();
            showToast("Password updated");
        } catch (err) { showToast(err.message); }
        btn.disabled = false;
    });
}

/* Profile photo */
(function () {
    const input = document.getElementById("avatarInput"), remove = document.getElementById("avatarRemove"), big = document.getElementById("profileAvatar");
    if (!input || !big) return;
    const fallback = big.getAttribute("src");   /* the default silhouette */
    function show(url) {
        const src = url || fallback;
        document.querySelectorAll(".user-profile img, .sidebar-user img, #profileAvatar").forEach(function (i) { i.src = src; });
        remove.hidden = !url;
    }
    input.addEventListener("change", async function () {
        const file = input.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) { input.value = ""; return showToast("Please choose an image file."); }
        if (file.size > 3 * 1024 * 1024) { input.value = ""; return showToast("Photo must be under 3 MB."); }
        const fd = new FormData();
        fd.append("avatar", file);
        showToast("Uploading photo...");
        try { const r = await api("/profile/avatar", { method: "PUT", form: fd }); show(r.avatarUrl); showToast("Profile photo updated"); }
        catch (err) { showToast(err.message); }
        input.value = "";
    });
    remove.addEventListener("click", async function () {
        const ok = await confirmDialog("Remove your profile photo?", { tone: "danger", icon: "trash", title: "Remove photo", ok: "Remove" });
        if (!ok) return;
        try { await api("/profile/avatar", { method: "DELETE" }); show(""); showToast("Photo removed"); }
        catch (err) { showToast(err.message); }
    });
})();
