function showError(id, msg) {
    const box = document.getElementById(id);
    if (!box) return;
    box.textContent = msg;
    box.classList.add("show");
}
function clearErrors() {
    document.querySelectorAll(".form-error").forEach(function (b) { b.classList.remove("show"); });
}
function setBusy(btn, busy, text) {
    btn.disabled = busy;
    if (text) btn.textContent = text;
}

function requestedUserPage() {
    const next = new URLSearchParams(location.search).get("next");
    return next && /^\/pages\/user\/[a-z-]+\.html(?:\?[^#]*)?$/.test(next) ? next : "";
}
function destinationFor(data) {
    const next = requestedUserPage();
    return next && data.redirect.indexOf("user/") === 0 ? next : "/pages/" + data.redirect;
}
const requestedPage = requestedUserPage();
const registerLink = document.getElementById("registerLink");
if (registerLink && requestedPage) registerLink.href += "?next=" + encodeURIComponent(requestedPage);
const loginLink = document.getElementById("loginLink");
if (loginLink && requestedPage) loginLink.href += "?next=" + encodeURIComponent(requestedPage);

/* ---------- LOGIN ---------- */
const loginForm = document.getElementById("loginForm");
let rememberMe = false;
if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearErrors();
        const email = loginForm.elements.email.value.trim();
        const password = loginForm.elements.password.value;
        if (!email || !password) return showError("loginError", "Please enter your email and password.");
        rememberMe = loginForm.elements.rememberMe.checked;

        const btn = loginForm.querySelector("button[type=submit]");
        const originalButtonMarkup = btn.innerHTML;
        setBusy(btn, true, "Logging in...");
        try {
            const data = await api("/auth/login", { method: "POST", body: { email: email, password: password, rememberMe: rememberMe } });
            if (data.twoFactor) { start2fa(data.pendingToken); setBusy(btn, false); btn.innerHTML = originalButtonMarkup; return; }
            location.href = destinationFor(data);
        } catch (err) {
            showError("loginError", err.message);
            setBusy(btn, false);
            btn.innerHTML = originalButtonMarkup;
        }
    });
}

/* ---------- REGISTER (step 1) + VERIFY CODE (step 2) ---------- */
const registerForm = document.getElementById("registerForm");
const verifyForm = document.getElementById("verifyForm");
let pendingEmail = "";

if (registerForm && verifyForm) {
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");

    registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearErrors();
        const f = registerForm;
        if (!f.fullname.value.trim() || !f.email.value.trim()) return showError("formError", "Please fill in all fields.");
        if (f.password.value.length < 6) return showError("formError", "Password must be at least 6 characters.");

        const btn = f.querySelector("button[type=submit]");
        setBusy(btn, true, "Sending code...");
        try {
            await api("/auth/register", {
                method: "POST",
                body: { name: f.fullname.value.trim(), email: f.email.value.trim(), password: f.password.value }
            });
            pendingEmail = f.email.value.trim().toLowerCase();
            document.getElementById("sentTo").textContent = pendingEmail;
            step1.hidden = true;
            step2.hidden = false;
            verifyForm.code.focus();
        } catch (err) {
            showError("formError", err.message);
        }
        setBusy(btn, false, "Register");
    });

    verifyForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearErrors();
        const code = verifyForm.code.value.trim();
        if (!/^\d{6}$/.test(code)) return showError("verifyError", "Enter the 6-digit code from your email.");

        const btn = verifyForm.querySelector("button[type=submit]");
        setBusy(btn, true, "Verifying...");
        try {
            const data = await api("/auth/verify", { method: "POST", body: { email: pendingEmail, code: code } });
            location.href = destinationFor(data);
        } catch (err) {
            showError("verifyError", err.message);
            setBusy(btn, false, "Verify & Create Account");
        }
    });

    document.getElementById("resendBtn").addEventListener("click", async function () {
        clearErrors();
        try {
            await api("/auth/resend-code", { method: "POST", body: { email: pendingEmail } });
            showToast("A new code has been sent");
        } catch (err) {
            showError("verifyError", err.message);
        }
    });

    document.getElementById("changeEmailBtn").addEventListener("click", function () {
        clearErrors();
        step2.hidden = true;
        step1.hidden = false;
    });
}

/* ---------- LOGIN: 2FA step ---------- */
let pendingToken = "";
function start2fa(token) {
    pendingToken = token;
    document.getElementById("loginForm").hidden = true;
    document.getElementById("twoFactorForm").hidden = false;
    document.querySelector(".auth-card h1").textContent = "Two-Factor Verification";
    document.querySelector(".auth-card .sub").textContent = "Enter the 6-digit code from your authenticator app.";
    document.querySelectorAll(".auth-card > .auth-foot").forEach(function (x) { x.hidden = true; });
    clearErrors();
    document.querySelector("#twoFactorForm [name=code]").focus();
}
const twoFactorForm = document.getElementById("twoFactorForm");
if (twoFactorForm) twoFactorForm.addEventListener("submit", async function (e) {
    e.preventDefault(); clearErrors();
    const code = twoFactorForm.querySelector("[name=code]").value.trim();
    if (!code) return showError("formError", "Enter your code.");
    const btn = twoFactorForm.querySelector("button[type=submit]");
    setBusy(btn, true, "Verifying...");
    try {
        const data = await api("/auth/login/2fa", { method: "POST", body: { pendingToken: pendingToken, code: code, rememberMe: rememberMe } });
        location.href = destinationFor(data);
    } catch (err) {
        showError("formError", err.message);
        setBusy(btn, false, "Verify");
        if (err.status === 401) setTimeout(function () { location.reload(); }, 1800);
    }
});

/* ---------- REGISTER: show which email domains are accepted ---------- */
(function () {
    const hint = document.getElementById("domainHint");
    if (!hint) return;
    fetch("/api/config").then(function (r) { return r.json(); }).then(function (c) {
        if (!c.emailDomains || !c.emailDomains.length) return;
        const list = c.emailDomains.map(function (d) { return "@" + d; }).join(" or ");
        hint.textContent = "Use your university email (" + list + ").";
        hint.hidden = false;
        const em = document.querySelector("#registerForm [name=email]");
        if (em) em.placeholder = "you" + "@" + c.emailDomains[0];
    }).catch(function () {});
})();
