/* Forgot password: email -> code + new password */
(function () {
    const forgotForm = document.getElementById("forgotForm");
    const resetForm = document.getElementById("resetForm");
    if (!forgotForm || !resetForm) return;
    let email = "";
    const show = function (id, msg) { const b = document.getElementById(id); b.textContent = msg; b.classList.add("show"); };
    const clear = function () { document.querySelectorAll(".form-error").forEach(function (b) { b.classList.remove("show"); }); };

    forgotForm.addEventListener("submit", async function (e) {
        e.preventDefault(); clear();
        email = forgotForm.querySelector("[name=email]").value.trim().toLowerCase();
        if (!email) return show("formError", "Please enter your email.");
        const btn = forgotForm.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Sending...";
        try {
            await api("/auth/forgot", { method: "POST", body: { email: email } });
            document.getElementById("sentTo").textContent = email;
            document.getElementById("step1").hidden = true;
            document.getElementById("step2").hidden = false;
            resetForm.querySelector("[name=code]").focus();
        } catch (err) { show("formError", err.message); }
        btn.disabled = false; btn.textContent = "Send Code";
    });

    resetForm.addEventListener("submit", async function (e) {
        e.preventDefault(); clear();
        const g = function (n) { return resetForm.querySelector("[name=" + n + "]").value; };
        if (!/^\d{6}$/.test(g("code").trim())) return show("resetError", "Enter the 6-digit code from your email.");
        if (g("password").length < 6) return show("resetError", "Password must be at least 6 characters.");
        if (g("password") !== g("confirm")) return show("resetError", "Passwords do not match.");
        const btn = resetForm.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
            await api("/auth/reset", { method: "POST", body: { email: email, code: g("code").trim(), password: g("password") } });
            showToast("Password updated. Please log in.");
            setTimeout(function () { location.href = "login.html"; }, 1200);
        } catch (err) { show("resetError", err.message); btn.disabled = false; }
    });

    document.getElementById("resendBtn").addEventListener("click", async function () {
        clear();
        try { await api("/auth/forgot", { method: "POST", body: { email: email } }); showToast("If the email is registered, a new code was sent."); }
        catch (err) { show("resetError", err.message); }
    });
    document.getElementById("changeEmailBtn").addEventListener("click", function () {
        clear();
        document.getElementById("step2").hidden = true;
        document.getElementById("step1").hidden = false;
    });
})();
