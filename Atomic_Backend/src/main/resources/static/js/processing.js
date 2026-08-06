(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    if (!user) {
        return;
    }

    let batch = AtomicApi.getPendingBatch();

    // Keep older one-transfer sessions compatible with the new batch page.
    if (!batch.length) {
        const pendingRequest = AtomicApi.getPendingRequest();
        if (pendingRequest) {
            batch = [{
                ...pendingRequest,
                clientId: 1,
                submissionState: "submitted"
            }];
        }
    }

    if (!batch.length) {
        location.replace("/transaction.html");
        return;
    }

    const list = document.querySelector("#batch-processing-list");
    const copy = document.querySelector("#processing-copy");
    const overallStatus = document.querySelector("#overall-status");
    const pollNote = document.querySelector("#poll-note");
    const pollMessage = document.querySelector("#poll-message");
    const retryButton = document.querySelector("#retry-status");
    let stopped = false;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function transactionMatches(item, transaction) {
        return String(transaction.creditAccountNumber)
                === String(item.creditAccountNumber)
            && Math.abs(Number(transaction.amount) - Number(item.amount)) < 0.005;
    }

    function isTerminal(item) {
        return Number(item.status) === 4 || Number(item.status) === 5;
    }

    function formatProcessingTime(item) {
        if (item.processingMode !== "scheduled" || !item.processingTime) {
            return "Immediate";
        }

        const date = new Date(item.processingTime);
        if (Number.isNaN(date.getTime())) {
            return "Scheduled";
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function workflowSteps(status) {
        const labels = ["Created", "Validated", "Sent", "Completed"];

        return labels.map((label, index) => {
            const step = index + 1;
            let className = "batch-step";

            if (status === 5) {
                className += step === 1
                    ? " batch-step--done"
                    : step === 2
                        ? " batch-step--failed"
                        : "";
            } else if (status === 4 || step < status) {
                className += " batch-step--done";
            } else if (step === status) {
                className += " batch-step--active";
            }

            return `<span class="${className}">${step}. ${label}</span>`;
        }).join("");
    }

    function itemStatus(item) {
        if (item.submissionState === "failed" && !item.transactionId) {
            return { label: "Couldn’t submit", className: "failed" };
        }
        if (!item.status) {
            return { label: "Locating", className: "created" };
        }
        return AtomicApi.statusInfo(item.status);
    }

    function renderBatch() {
        const completed = batch.filter((item) => Number(item.status) === 4).length;
        const failed = batch.filter((item) => Number(item.status) === 5).length;
        const pending = batch.length - completed - failed;

        document.querySelector("#batch-total").textContent = String(batch.length);
        document.querySelector("#batch-pending").textContent = String(pending);
        document.querySelector("#batch-completed").textContent = String(completed);
        document.querySelector("#batch-failed").textContent = String(failed);

        if (!pending && !failed) {
            overallStatus.className = "badge badge--completed";
            overallStatus.textContent = "Completed";
            copy.textContent = "All of your transfers were completed successfully.";
        } else if (!pending && failed) {
            overallStatus.className = "badge badge--failed";
            overallStatus.textContent = "Some transfers failed";
            copy.textContent = `${completed} of your transfers completed, and ${failed} couldn’t be completed.`;
        } else {
            overallStatus.className = "badge badge--sent";
            overallStatus.textContent = "In progress";
            copy.textContent = `${pending} transfer${pending === 1 ? " is" : "s are"} still waiting or being processed.`;
        }

        list.innerHTML = batch.map((item, index) => {
            const status = Number(item.status || 1);
            const info = itemStatus(item);
            const reference = item.transactionId
                ? `#${escapeHtml(item.transactionId)}`
                : `Transfer ${index + 1}`;
            const note = item.submissionError
                ? `<p class="batch-transfer__error">${escapeHtml(item.submissionError)}</p>`
                : "";

            return `
                <article class="batch-transfer">
                    <header>
                        <div>
                            <strong>${reference} · ${AtomicApi.maskAccount(item.creditAccountNumber)}</strong>
                            <span>${AtomicApi.formatMoney(item.amount)} · ${formatProcessingTime(item)}</span>
                        </div>
                        <span class="badge badge--${info.className}">${info.label}</span>
                    </header>
                    <div class="batch-steps" aria-label="Workflow for ${reference}">
                        ${workflowSteps(status)}
                    </div>
                    ${note}
                </article>
            `;
        }).join("");
    }

    function connectTransactions(transactions) {
        const assignedIds = new Set();

        // First connect every transaction whose ID came from the backend response.
        batch.forEach((item) => {
            if (!item.transactionId) {
                return;
            }

            const match = transactions.find((transaction) =>
                String(AtomicApi.transactionId(transaction))
                === String(item.transactionId));

            if (match) {
                item.transaction = match;
                item.status = Number(match.status);
                assignedIds.add(String(AtomicApi.transactionId(match)));
            }
        });

        // Immediate submissions return text without an ID, so match any remaining rows.
        batch.forEach((item) => {
            if (item.transactionId || item.submissionState === "failed") {
                return;
            }

            const candidates = transactions
                .filter((transaction) => {
                    const id = String(AtomicApi.transactionId(transaction));
                    const transactionTime = new Date(transaction.timeDate).getTime();
                    const earliestExpectedTime = Number(item.submittedAt || item.queuedAt || 0)
                        - 10_000;
                    return !assignedIds.has(id)
                        && transactionMatches(item, transaction)
                        && (!Number.isFinite(transactionTime)
                            || transactionTime >= earliestExpectedTime);
                })
                .sort((left, right) =>
                    Number(AtomicApi.transactionId(left))
                    - Number(AtomicApi.transactionId(right)));

            const match = candidates[0];
            if (!match) {
                return;
            }

            item.transactionId = String(AtomicApi.transactionId(match));
            item.transaction = match;
            item.status = Number(match.status);
            assignedIds.add(item.transactionId);
        });

        batch.forEach((item) => {
            if (item.submissionState === "failed" && !item.transactionId) {
                item.status = 5;
            }
        });

        AtomicApi.setPendingBatch(batch);
    }

    function nextPollDelay() {
        const futureTimes = batch
            .filter((item) => !isTerminal(item) && item.processingTime)
            .map((item) => new Date(item.processingTime).getTime())
            .filter(Number.isFinite);

        if (!futureTimes.length) {
            return 1_000;
        }

        const nextTime = Math.min(...futureTimes);
        const remaining = nextTime - Date.now();

        if (remaining > 5 * 60_000) {
            return 60_000;
        }
        if (remaining > 30_000) {
            return 15_000;
        }
        if (remaining > 0) {
            return 2_000;
        }
        return 1_000;
    }

    async function openResultPage() {
        batch
            .filter((item) => Number(item.status) === 4 && item.transaction)
            .forEach((item) => AtomicApi.applyCompletedDebitToUser(item.transaction));

        const allCompleted = batch.every((item) => Number(item.status) === 4);
        pollMessage.textContent = allCompleted
            ? "Your transfers are complete. Opening your receipt…"
            : "We’ve finished processing your transfers. Opening the results…";

        await new Promise((resolve) => window.setTimeout(resolve, 900));
        location.replace(allCompleted ? "/success.html" : "/failed.html");
    }

    async function checkStatuses() {
        if (stopped) {
            return;
        }

        retryButton.hidden = true;
        pollNote.hidden = false;

        try {
            const transactions = await AtomicApi.fetchTransactionsForDebit(
                user.accountNumber
            );

            connectTransactions(transactions);
            renderBatch();

            if (batch.every(isTerminal)) {
                stopped = true;
                await openResultPage();
                return;
            }

            const futureCount = batch.filter((item) =>
                !isTerminal(item)
                && item.processingTime
                && new Date(item.processingTime).getTime() > Date.now()).length;

            pollMessage.textContent = futureCount
                ? `${futureCount} scheduled transfer${futureCount === 1 ? " will" : "s will"} start at the time you selected.`
                : "Your transfers are still being processed. We’ll check again shortly…";

            window.setTimeout(checkStatuses, nextPollDelay());
        } catch (error) {
            pollNote.hidden = true;
            retryButton.hidden = false;
            copy.textContent = "We couldn’t check the latest progress. Please try again.";
            pollMessage.textContent = error.message;

            if (error.status === 401) {
                window.setTimeout(() => location.replace("/login.html"), 900);
            }
        }
    }

    retryButton.addEventListener("click", () => {
        stopped = false;
        checkStatuses();
    });

    renderBatch();
    checkStatuses();
})();
