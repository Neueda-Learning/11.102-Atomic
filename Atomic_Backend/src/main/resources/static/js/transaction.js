(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    if (!user) {
        return;
    }

    AtomicApi.populateUser(user);
    AtomicApi.bindLogout();

    const form = document.querySelector("#transaction-form");
    const button = document.querySelector("#submit-transaction");
    const message = document.querySelector("#transaction-message");
    document.querySelector("#debit-account").value = user.accountNumber;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.classList.remove("form-message--error");

        const creditAccountNumber = document.querySelector("#credit-account").value.trim();
        const amount = Number(document.querySelector("#amount").value);

        if (creditAccountNumber === user.accountNumber) {
            message.classList.add("form-message--error");
            message.textContent = "Debit and credit accounts cannot be the same.";
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            message.classList.add("form-message--error");
            message.textContent = "Enter an amount greater than zero.";
            return;
        }

        if (amount > user.balance) {
            message.classList.add("form-message--error");
            message.textContent = "The amount exceeds the wallet balance returned at login.";
            return;
        }

        const pendingRequest = {
            debitAccountNumber: user.accountNumber,
            creditAccountNumber,
            amount,
            submittedAt: Date.now()
        };

        const params = new URLSearchParams({
            credit_account_number: creditAccountNumber,
            amount: String(amount)
        });

        try {
            AtomicApi.setButtonLoading(button, true, "Submitting…");
            message.textContent = "Creating the transaction…";
            AtomicApi.clearTransactionState();
            AtomicApi.setPendingRequest(pendingRequest);

            const backendMessage = await AtomicApi.request(
                `/home/transaction/submit?${params}`,
                { method: "POST" }
            );

            pendingRequest.backendMessage = String(backendMessage ?? "");
            AtomicApi.setPendingRequest(pendingRequest);
            location.assign("/processing.html");
        } catch (error) {
            message.classList.add("form-message--error");
            message.textContent = error.status === 401
                ? "Your login session has expired. Please sign in again."
                : error.message || "The transaction could not be submitted.";
            if (error.status === 401) {
                window.setTimeout(() => location.replace("/login.html"), 900);
            }
        } finally {
            AtomicApi.setButtonLoading(button, false);
        }
    });
})();
