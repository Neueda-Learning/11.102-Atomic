(function () {
    "use strict";

    let user = AtomicApi.requireUser();
    const resultType = document.body.dataset.result;
    let batch = AtomicApi.getPendingBatch();
    let feedbackTimer;

    if (!user) {
        return;
    }

    // Preserve compatibility with receipts created by the older single-transfer page.
    if (!batch.length) {
        const pendingRequest = AtomicApi.getPendingRequest();
        const transaction = AtomicApi.getTransaction();

        if (pendingRequest && transaction) {
            batch = [{
                ...pendingRequest,
                transaction,
                transactionId: AtomicApi.transactionId(transaction),
                status: Number(transaction.status)
            }];
        }
    }

    if (!batch.length) {
        location.replace("/transaction.html");
        return;
    }

    function isTerminal(item) {
        return Number(item.status) === 4 || Number(item.status) === 5;
    }

    function statusClass(status) {
        if (Number(status) === 5) {
            return "badge badge--failed";
        }
        if (Number(status) === 4) {
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
        window.clearTimeout(feedbackTimer);
        feedbackTimer = window.setTimeout(() => {
            feedback.textContent = "";
        }, 2200);
    }

    function referenceText() {
        const references = batch
            .map((item) => item.transactionId)
            .filter(Boolean)
            .map((id) => `#${id}`);

        return references.length
            ? references.join(", ")
            : "No transaction references are available";
    }

    async function copyReference() {
        const value = referenceText();

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
                showFeedback(batch.length > 1
                    ? "References copied."
                    : "Reference copied.");
                return;
            }
        } catch (error) {
            // Use the fallback below when clipboard permission is unavailable.
        }

        const input = document.createElement("input");
        input.value = value;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        showFeedback("References copied.");
    }

    function bindUtilityActions() {
        document.querySelector("#copy-reference")?.addEventListener("click", () => {
            copyReference().catch(() => showFeedback("We couldn’t copy that right now."));
        });

        document.querySelector("#print-receipt")?.addEventListener("click", () => {
            window.print();
        });
    }

    function renderSingle(item) {
        const transaction = item.transaction || {
            transID: item.transactionId,
            debitAccountNumber: item.debitAccountNumber,
            creditAccountNumber: item.creditAccountNumber,
            amount: item.amount,
            status: item.status
        };
        const info = AtomicApi.statusInfo(transaction.status);

        document.querySelector("#result-id").textContent = item.transactionId
            ? `#${item.transactionId}`
            : "Unavailable";
        document.querySelector("#result-amount").textContent =
            AtomicApi.formatMoney(transaction.amount);
        document.querySelector("#result-debit").textContent =
            AtomicApi.maskAccount(transaction.debitAccountNumber);
        document.querySelector("#result-credit").textContent =
            AtomicApi.maskAccount(transaction.creditAccountNumber);

        const statusElement = document.querySelector("#result-status");
        statusElement.textContent = info.label;
        statusElement.className = statusClass(transaction.status);

        const balanceElement = document.querySelector("#result-balance");
        if (balanceElement) {
            balanceElement.textContent = AtomicApi.formatMoney(user.balance);
        }
    }

    function renderBatch() {
        document.querySelector("#single-result").hidden = true;
        document.querySelector("#batch-result").hidden = false;

        const completed = batch.filter((item) => Number(item.status) === 4).length;
        const failed = batch.filter((item) => Number(item.status) === 5).length;

        document.querySelector("#batch-result-summary").textContent =
            `${completed} completed · ${failed} failed · ${batch.length} total`;

        document.querySelector("#batch-result-list").innerHTML = batch.map((item, index) => {
            const info = AtomicApi.statusInfo(item.status);
            const reference = item.transactionId
                ? `#${item.transactionId}`
                : `Transfer ${index + 1}`;

            return `
                <div class="batch-result-row">
                    <div>
                        <strong>${reference} · ${AtomicApi.maskAccount(item.creditAccountNumber)}</strong>
                        <span>${AtomicApi.formatMoney(item.amount)}</span>
                    </div>
                    <span class="badge badge--${info.className}">${info.label}</span>
                </div>
            `;
        }).join("");

        const balance = document.querySelector("#batch-result-balance");
        if (balance) {
            balance.textContent = AtomicApi.formatMoney(user.balance);
        }

        if (resultType === "success") {
            document.querySelector("#result-heading").textContent =
                "All transfers completed.";
            document.querySelector(".result-copy").textContent =
                "Every transfer in this batch was completed successfully.";
        } else {
            document.querySelector("#result-heading").textContent =
                "Batch completed with issues.";
            document.querySelector(".result-copy").textContent =
                "Your successful transfers are complete. You can review the transfers that failed below.";
        }
    }

    async function refreshFromBackend() {
        try {
            const transactions = await AtomicApi.fetchTransactionsForDebit(
                user.accountNumber
            );

            batch.forEach((item) => {
                if (!item.transactionId) {
                    return;
                }

                const transaction = transactions.find((candidate) =>
                    String(AtomicApi.transactionId(candidate))
                    === String(item.transactionId));

                if (transaction) {
                    item.transaction = transaction;
                    item.status = Number(transaction.status);
                }
            });

            AtomicApi.setPendingBatch(batch);
        } catch (error) {
            // Processing already fetched these statuses. Retain the stored receipt.
        }
    }

    async function verifyAndRender() {
        await refreshFromBackend();

        if (!batch.every(isTerminal)) {
            location.replace("/processing.html");
            return;
        }

        const allCompleted = batch.every((item) => Number(item.status) === 4);
        if (resultType === "success" && !allCompleted) {
            location.replace("/failed.html");
            return;
        }
        if (resultType === "failed" && allCompleted) {
            location.replace("/success.html");
            return;
        }

        batch
            .filter((item) => Number(item.status) === 4 && item.transaction)
            .forEach((item) => {
                user = AtomicApi.applyCompletedDebitToUser(item.transaction) || user;
            });

        if (batch.length === 1) {
            renderSingle(batch[0]);
        } else {
            renderBatch();
        }
    }

    bindUtilityActions();
    verifyAndRender();
})();
