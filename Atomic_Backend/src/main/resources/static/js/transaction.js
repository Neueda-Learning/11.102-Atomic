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
    const debitAccountInput = document.querySelector("#debit-account");
    const creditAccountInput = document.querySelector("#credit-account");
    const amountInput = document.querySelector("#amount");
    const creditFeedback = document.querySelector("#credit-feedback");
    const amountFeedback = document.querySelector("#amount-feedback");
    const previewAmount = document.querySelector("#preview-amount");
    const previewBalance = document.querySelector("#preview-balance");

    debitAccountInput.value = user.accountNumber;

    function setFieldFeedback(element, text, isError) {
        if (!element) {
            return;
        }
        element.textContent = text;
        element.classList.toggle("field-note--error", Boolean(isError));
        element.classList.toggle("field-note--success", !isError && Boolean(text));
    }

    function validateCredit(showFeedback) {
        const digitsOnly = creditAccountInput.value.replace(/\D+/g, "");
        if (digitsOnly !== creditAccountInput.value) {
            creditAccountInput.value = digitsOnly;
        }

        if (!digitsOnly) {
            if (showFeedback) {
                setFieldFeedback(creditFeedback, "Enter destination account number.", true);
            }
            return false;
        }

        if (digitsOnly === user.accountNumber) {
            setFieldFeedback(creditFeedback, "Debit and credit accounts cannot be the same.", true);
            return false;
        }

        setFieldFeedback(creditFeedback, "Destination account looks valid.", false);
        return true;
    }

    function validateAmount(showFeedback) {
        const amount = Number(amountInput.value);
        if (!Number.isFinite(amount) || amount <= 0) {
            if (showFeedback) {
                setFieldFeedback(amountFeedback, "Enter an amount greater than zero.", true);
            }
            return false;
        }

        if (amount > user.balance) {
            setFieldFeedback(amountFeedback, "Amount exceeds available balance.", true);
            return false;
        }

        setFieldFeedback(amountFeedback, "Amount is within your available balance.", false);
        return true;
    }

    function refreshPreview() {
        const amount = Number(amountInput.value);
        previewAmount.textContent = AtomicApi.formatMoney(Number.isFinite(amount) ? amount : 0);

        if (!Number.isFinite(amount) || amount < 0) {
            previewBalance.textContent = AtomicApi.formatMoney(user.balance);
            return;
        }

        previewBalance.textContent = AtomicApi.formatMoney(Math.max(0, user.balance - amount));
    }

    function syncFormState(showFeedback) {
        const creditOk = validateCredit(showFeedback);
        const amountOk = validateAmount(showFeedback);
        refreshPreview();
        button.disabled = !(creditOk && amountOk);
        return creditOk && amountOk;
    }

    creditAccountInput.addEventListener("input", () => {
        syncFormState(true);
    });

    amountInput.addEventListener("input", () => {
        syncFormState(true);
    });

    syncFormState(false);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.classList.remove("form-message--error");

        if (!syncFormState(true)) {
            message.classList.add("form-message--error");
            message.textContent = "Please fix highlighted fields before submitting.";
            return;
        }

        const creditAccountNumber = creditAccountInput.value.trim();
        const amount = Number(amountInput.value);

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
            syncFormState(false);
        }
    });
})();
