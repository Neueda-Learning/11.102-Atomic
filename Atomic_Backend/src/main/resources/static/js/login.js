(function () {
    "use strict";

    const form = document.querySelector("#login-form");
    const button = document.querySelector("#login-button");
    const message = document.querySelector("#login-message");

    if (new URLSearchParams(location.search).get("created") === "1") {
        message.textContent = "Account created. Sign in to continue.";
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.classList.remove("form-message--error");
        message.textContent = "Checking your credentials…";

        try {
            AtomicApi.setButtonLoading(button, true, "Signing in…");
            const user = await AtomicApi.request("/home/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: document.querySelector("#email").value.trim(),
                    password: document.querySelector("#password").value
                })
            });

            AtomicApi.setUser(user);
            AtomicApi.clearTransactionState();

            const requestedPath = new URLSearchParams(location.search).get("returnTo");
            const protectedPages = new Set([
                "/dashboard.html",
                "/transaction.html",
                "/transactions.html",
                "/processing.html",
                "/success.html",
                "/failed.html",
                "/alerts.html",
                "/rules.html"
            ]);
            const requestedUrl = new URL(requestedPath || "/dashboard.html", location.origin);
            const destination = requestedUrl.origin === location.origin
                && protectedPages.has(requestedUrl.pathname)
                ? `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`
                : "/dashboard.html";
            location.replace(destination);
        } catch (error) {
            message.classList.add("form-message--error");
            message.textContent = error.status === 401
                ? "The email or password is incorrect."
                : "We couldn’t sign you in right now. Please try again in a moment.";
        } finally {
            AtomicApi.setButtonLoading(button, false);
        }
    });
})();
