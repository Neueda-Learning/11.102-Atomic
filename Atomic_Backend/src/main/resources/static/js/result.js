(function () {
    "use strict";

    let user = AtomicApi.requireUser();
    const pendingRequest = AtomicApi.getPendingRequest();
    let transaction = AtomicApi.getTransaction();
    const resultType = document.body.dataset.result;
    let feedbackTimer;

    if (!user) {
        return;
    }
    if (!pendingRequest || !transaction) {
        location.replace("/transaction.html");
        return;
    }

    function statusClass(status) {
        if (status === 5) {
            return "badge badge--failed";
        }
        if (status === 4) {
            return "badge badge--completed";
        }
        return "badge badge--sent";
    }

    function showFeedback(message) {
        const feedback = document.querySelector("#result-feedback");
        if (!feedback) {
            return;
        }

        feedback.textContent = message;
        clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(function () {
            feedback.textContent = "";
        }, 2200);
    }

    async function copyReference() {
        const value = `#${AtomicApi.transactionId(transaction)}`;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(value);
                showFeedback("Reference copied.");
                return;
            }
        } catch (error) {
            // Fallback below handles blocked clipboard permissions.
        }

        const fallbackInput = document.createElement("input");
        fallbackInput.value = value;
        document.body.appendChild(fallbackInput);
        fallbackInput.select();
        document.execCommand("copy");
        fallbackInput.remove();
        showFeedback("Reference copied.");
    }

    function bindUtilityActions() {
        const copyButton = document.querySelector("#copy-reference");
        if (copyButton) {
            copyButton.addEventListener("click", function () {
                copyReference().catch(function () {
                    showFeedback("Unable to copy right now.");
                });
            });
        }

        const printButton = document.querySelector("#print-receipt");
        if (printButton) {
            printButton.addEventListener("click", function () {
                window.print();
            });
        }
    }

    function render() {
        const info = AtomicApi.statusInfo(transaction.status);
        document.querySelector("#result-id").textContent = `#${AtomicApi.transactionId(transaction)}`;
        document.querySelector("#result-amount").textContent = AtomicApi.formatMoney(transaction.amount);
        document.querySelector("#result-debit").textContent = AtomicApi.maskAccount(transaction.debitAccountNumber);
        document.querySelector("#result-credit").textContent = AtomicApi.maskAccount(transaction.creditAccountNumber);
        const statusElement = document.querySelector("#result-status");
        statusElement.textContent = info.label;
        statusElement.className = statusClass(Number(transaction.status));

        const balanceElement = document.querySelector("#result-balance");
        if (balanceElement) {
            balanceElement.textContent = AtomicApi.formatMoney(user.balance);
            balanceElement.title = "Current session balance after completed transfers";
        }
    }

    async function verifyTerminalStatus() {
        try {
            const transactions = await AtomicApi.fetchTransactionsForDebit(user.accountNumber);
            const verified = AtomicApi.findSubmittedTransaction(
                transactions,
                pendingRequest,
                AtomicApi.transactionId(transaction)
            );

            if (verified) {
                transaction = verified;
                AtomicApi.setTransaction(verified);
            }

            const status = Number(transaction.status);
            if (resultType === "success" && status !== 4) {
                location.replace(status === 5
                    ? "/failed.html"
                    : "/processing.html");
                return;
            }
            if (resultType === "failed" && status !== 5) {
                location.replace(status === 4
                    ? "/success.html"
                    : "/processing.html");
                return;
            }

            if (status === 4) {
                user = AtomicApi.applyCompletedDebitToUser(transaction) ?? user;
            }

            render();
        } catch (error) {
            // The stored transaction was itself previously fetched from the backend.
            // Keep the receipt visible when a subsequent verification request fails.
            if (Number(transaction.status) === 4) {
                user = AtomicApi.applyCompletedDebitToUser(transaction) ?? user;
            }
            render();
        }
    }

    bindUtilityActions();
    verifyTerminalStatus();
})();
