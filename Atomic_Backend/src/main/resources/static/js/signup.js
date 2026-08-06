(function () {
    "use strict";

    const form = document.querySelector("#signup-form");
    const button = document.querySelector("#signup-button");
    const message = document.querySelector("#signup-message");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.classList.remove("form-message--error");
        message.textContent = "Creating your account…";

        const params = new URLSearchParams({
            balance: document.querySelector("#opening-balance").value,
            firstName: document.querySelector("#first-name").value.trim(),
            lastName: document.querySelector("#last-name").value.trim(),
            email: document.querySelector("#signup-email").value.trim(),
            password: document.querySelector("#signup-password").value
        });

        try {
            AtomicApi.setButtonLoading(button, true, "Creating account…");
            await AtomicApi.request(`/home/signup?${params}`, { method: "POST" });
            location.replace("/login.html?created=1");
        } catch (error) {
            message.classList.add("form-message--error");
            message.textContent = error.message || "We couldn’t create your account. Please try again.";
        } finally {
            AtomicApi.setButtonLoading(button, false);
        }
    });
})();
