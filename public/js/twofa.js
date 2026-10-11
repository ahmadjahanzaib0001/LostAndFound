/* Settings: turn two-factor authentication on / off */
(function () {
    const box = document.getElementById("twoFaBody");
    if (!box) return;
    const val = function (id) { return document.getElementById(id).value; };

    async function load() {
        try {
            const s = await api("/2fa/status");
            if (!s.enabled) {
                box.innerHTML = '<p class="tf-text">Add a second step to your login: a 6-digit code from an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.</p>' +
                    '<button class="btn btn-purple" id="tfStart">Enable 2FA</button>';
                document.getElementById("tfStart").onclick = setup;
            } else {
                box.innerHTML = '<p class="tf-on">' + LFIcon("shield-check") + ' Two-factor authentication is <strong>on</strong>. Recovery codes left: <strong>' + s.recoveryLeft + '</strong></p>' +
                    '<p class="tf-text">To turn it off, enter your password and a current code (or a recovery code).</p>' +
                    '<div class="form-grid"><div class="form-group"><label class="form-label">Password</label><input class="form-control" type="password" id="tfPass" autocomplete="current-password"></div>' +
                    '<div class="form-group"><label class="form-label">Code</label><input class="form-control" type="text" id="tfOff" maxlength="12" placeholder="123456"></div></div>' +
                    '<button class="btn btn-danger" id="tfDisable">Disable 2FA</button>';
                document.getElementById("tfDisable").onclick = disable;
            }
        } catch (err) { box.innerHTML = '<p class="tf-text">' + esc(err.message) + '</p>'; }
    }

    async function setup() {
        try {
            const r = await api("/2fa/setup", { method: "POST" });
            box.innerHTML = '<div class="tf-setup"><img class="tf-qr" src="' + r.qr + '" alt="QR code"><div class="tf-steps">' +
                '<p><strong>1.</strong> Scan this QR code with your authenticator app.</p>' +
                '<p class="tf-text">Cannot scan? Enter this key by hand:<br><code>' + esc(r.secret) + '</code></p>' +
                '<p><strong>2.</strong> Type the 6-digit code the app shows:</p>' +
                '<input class="form-control code-input" id="tfCode" maxlength="6" inputmode="numeric" placeholder="000000" style="max-width:220px">' +
                '<div style="margin-top:12px;display:flex;gap:10px"><button class="btn btn-purple" id="tfConfirm">Confirm and enable</button><button class="btn btn-outline" id="tfCancel">Cancel</button></div></div></div>';
            document.getElementById("tfConfirm").onclick = confirmCode;
            document.getElementById("tfCancel").onclick = load;
        } catch (err) { showToast(err.message); }
    }

    async function confirmCode() {
        try { const r = await api("/2fa/enable", { method: "POST", body: { code: val("tfCode") } }); showCodes(r.recoveryCodes); }
        catch (err) { showToast(err.message); }
    }

    function showCodes(codes) {
        box.innerHTML = '<p class="tf-on">' + LFIcon("check-circle") + ' Two-factor authentication is now on.</p>' +
            '<p class="tf-text"><strong>Save these recovery codes now.</strong> Each one works once if you lose your phone. They will not be shown again.</p>' +
            '<div class="tf-codes">' + codes.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join("") + '</div>' +
            '<div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-outline" id="tfDownload">Download codes</button><button class="btn btn-purple" id="tfDone">I have saved them</button></div>';
        document.getElementById("tfDownload").onclick = function () {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob(["Campus Lost & Found recovery codes\n\n" + codes.join("\n") + "\n"], { type: "text/plain" }));
            a.download = "lost-and-found-recovery-codes.txt";
            a.click();
        };
        document.getElementById("tfDone").onclick = load;
    }

    async function disable() {
        try { await api("/2fa/disable", { method: "POST", body: { password: val("tfPass"), code: val("tfOff") } }); showToast("Two-factor authentication turned off"); load(); }
        catch (err) { showToast(err.message); }
    }
    load();
})();
