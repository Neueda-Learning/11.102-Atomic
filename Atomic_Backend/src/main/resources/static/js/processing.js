(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    const pendingRequest = AtomicApi.getPendingRequest();
    if (!user) {
        return;
    }
    if (!pendingRequest) {
        location.replace("/transaction.html");
        return;
    }

    const badge = document.querySelector("#status-badge");
    const copy = document.querySelector("#processing-copy");
    const pollMessage = document.querySelector("#poll-message");
    const retryButton = document.querySelector("#retry-status");
    const startedAt = Date.now();
    let attempts = 0;
    let stopped = false;

    document.querySelector("#summary-amount").textContent = AtomicApi.formatMoney(pendingRequest.amount);
    document.querySelector("#summary-credit").textContent = AtomicApi.maskAccount(pendingRequest.creditAccountNumber);

    function renderStatus(transaction) {
        const status = Number(transaction.status);
        const info = AtomicApi.statusInfo(status);
        badge.className = `badge badge--${info.className}`;
        badge.textContent = info.label;
        document.querySelector("#summary-id").textContent = `#${AtomicApi.transactionId(transaction)}`;
        copy.textContent = `The latest status fetched from the backend is ${info.label.toUpperCase()}.`;

        document.querySelectorAll("[data-step]").forEach((step) => {
            const stepNumber = Number(step.dataset.step);
            step.classList.remove("step--done", "step--active", "step--failed");

            if (status === 5) {
                if (stepNumber === 1) {
                    step.classList.add("step--done");
                } else if (stepNumber === 2) {
                    step.classList.add("step--failed");
                }
                return;
            }

            if (stepNumber < status || status === 4) {
                step.classList.add("step--done");
            } else if (stepNumber === status) {
                step.classList.add("step--active");
            }
        });
    }

    async function moveToResult(path) {
        const remaining = Math.max(0, 1200 - (Date.now() - startedAt));
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
        location.replace(path);
    }

    async function checkStatus() {
        if (stopped) {
            return;
        }

        attempts += 1;
        retryButton.hidden = true;
        document.querySelector("#poll-note").hidden = false;

        try {
            const transactions = await AtomicApi.fetchTransactionsForDebit(user.accountNumber);
            const knownTransaction = AtomicApi.getTransaction();
            const transaction = AtomicApi.findSubmittedTransaction(
                transactions,
                pendingRequest,
                AtomicApi.transactionId(knownTransaction)
            );

            if (!transaction) {
                pollMessage.textContent = "Waiting for the created transaction to appear…";
            } else {
                AtomicApi.setTransaction(transaction);
                renderStatus(transaction);

                const status = Number(transaction.status);
                if (status === 4) {
                    stopped = true;
                    pollMessage.textContent = "Completion confirmed. Opening the receipt…";
                    await moveToResult("/success.html");
                    return;
                }
                if (status === 5) {
                    stopped = true;
                    pollMessage.textContent = "The backend marked this transfer as failed.";
                    await moveToResult("/failed.html");
                    return;
                }

                pollMessage.textContent = "Checking again for the next backend state…";
            }

            if (attempts < 40) {
                window.setTimeout(checkStatus, 750);
                return;
            }

            stopped = true;
            document.querySelector("#poll-note").hidden = true;
            retryButton.hidden = false;
            copy.textContent = "Status checking timed out before a terminal state was returned.";
        } catch (error) {
            document.querySelector("#poll-note").hidden = true;
            retryButton.hidden = false;
            copy.textContent = "The latest status could not be fetched from the backend.";
            pollMessage.textContent = error.message;
        }
    }

    retryButton.addEventListener("click", () => {
        attempts = 0;
        stopped = false;
        checkStatus();
    });

    checkStatus();
})();
