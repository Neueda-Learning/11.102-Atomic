(function () {
    "use strict";

    const form = document.querySelector("#transaction-form");
    const fetchForm = document.querySelector("#fetch-form");
    const searchMode = document.querySelector("#search-mode");
    const resultContainer = document.querySelector("#transaction-results");
    const resultSummary = document.querySelector("#results-summary");
    const workflowPanel = document.querySelector("#live-workflow");
    const terminalStatuses = new Set([4, 5]);
    let activePoll = 0;
    let activeWorkflowId = null;
    let highestSuccessfulStatus = 0;

    function updateModeFields() {
        document.querySelectorAll("[data-mode-fields]").forEach((group) => {
            const isActive = group.dataset.modeFields === searchMode.value;
            group.hidden = !isActive;
            group.querySelectorAll("input").forEach((input) => {
                input.required = isActive;
            });
        });
    }

    function createSearchRequest() {
        const mode = searchMode.value;
        const params = new URLSearchParams();

        if (mode === "debit") {
            params.set("debit_account_number", document.querySelector("#fetch-debit").value.trim());
            return `/home/transaction/fetch/debit?${params}`;
        }

        if (mode === "credit") {
            params.set("credit_account_number", document.querySelector("#fetch-credit").value.trim());
            return `/home/transaction/fetch/credit?${params}`;
        }

        if (mode === "amount") {
            const minimum = Number(document.querySelector("#amount-after").value);
            const maximum = Number(document.querySelector("#amount-before").value);
            if (maximum < minimum) {
                throw new Error("Maximum amount must be greater than or equal to the minimum amount.");
            }
            params.set("amountAfter", String(minimum));
            params.set("amountBefore", String(maximum));
            return `/home/transaction/fetch/amount?${params}`;
        }

        const from = new Date(document.querySelector("#date-after").value);
        const to = new Date(document.querySelector("#date-before").value);
        if (to < from) {
            throw new Error("The end date must be later than the start date.");
        }
        params.set("date1", from.toISOString());
        params.set("date2", to.toISOString());
        return `/home/transaction/fetch/date?${params}`;
    }

    function normaliseTransactions(payload) {
        if (!payload) {
            return [];
        }
        return Array.isArray(payload) ? payload : [payload];
    }

    function transactionId(transaction) {
        return transaction.transID ?? transaction.transId ?? transaction.transactionId;
    }

    function renderTransactions(transactions) {
        if (!transactions.length) {
            resultSummary.textContent = "No transactions matched the selected criteria.";
            resultContainer.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">0</span>
                        <h3>No matching records</h3>
                        <p>Try another account number or widen the selected range.</p>
                    </div>
                </div>
            `;
            return;
        }

        resultSummary.textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} found.`;
        const rows = transactions.map((transaction) => `
            <tr>
                <td class="cell-strong">#${AtomicUI.escapeHtml(transactionId(transaction))}</td>
                <td title="${AtomicUI.escapeHtml(transaction.debitAccountNumber)}">${AtomicUI.formatAccount(transaction.debitAccountNumber)}</td>
                <td title="${AtomicUI.escapeHtml(transaction.creditAccountNumber)}">${AtomicUI.formatAccount(transaction.creditAccountNumber)}</td>
                <td class="cell-strong">${AtomicUI.formatCurrency(transaction.amount)}</td>
                <td>${AtomicUI.formatDate(transaction.timeDate)}</td>
                <td>${AtomicUI.statusBadge(transaction.status)}</td>
            </tr>
        `).join("");

        resultContainer.innerHTML = `
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Debit account</th>
                            <th>Credit account</th>
                            <th>Amount</th>
                            <th>Timestamp</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderWorkflow(transaction) {
        const status = Number(transaction.status);
        const id = transactionId(transaction);
        if (id !== activeWorkflowId) {
            activeWorkflowId = id;
            highestSuccessfulStatus = 0;
        }
        if (status >= 1 && status <= 4) {
            highestSuccessfulStatus = Math.max(highestSuccessfulStatus, status);
        }
        workflowPanel.classList.remove("is-hidden");
        document.querySelector("#workflow-id").textContent = `#${id}`;
        document.querySelector("#workflow-amount").textContent = AtomicUI.formatCurrency(transaction.amount);
        document.querySelector("#workflow-updated").textContent = new Intl.DateTimeFormat("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(new Date());
        document.querySelector("#workflow-status").innerHTML = AtomicUI.statusBadge(status);
        document.querySelector("#workflow-summary").textContent =
            `Transaction #${id} is ${AtomicUI.statusLabels[status] ?? `at status ${status}`}.`;

        document.querySelectorAll("[data-workflow-step]").forEach((step) => {
            const stepStatus = Number(step.dataset.workflowStep);
            step.classList.remove("workflow-step--complete", "workflow-step--current", "workflow-step--failed");

            if (status === 5) {
                if (stepStatus <= highestSuccessfulStatus) {
                    step.classList.add("workflow-step--complete");
                } else if (stepStatus === Math.min(highestSuccessfulStatus + 1, 4)) {
                    step.classList.add("workflow-step--failed");
                }
                return;
            }

            if (stepStatus < status || status === 4) {
                step.classList.add("workflow-step--complete");
            } else if (stepStatus === status) {
                step.classList.add("workflow-step--current");
            }
        });

        document.querySelector("#workflow-failure").hidden = status !== 5;
    }

    function delay(milliseconds) {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }

    async function followTransaction(initialTransaction) {
        const id = transactionId(initialTransaction);
        const pollToken = ++activePoll;
        let current = initialTransaction;
        let failedRequests = 0;
        let pollAttempts = 0;
        renderWorkflow(current);

        while (pollToken === activePoll
                && !terminalStatuses.has(Number(current.status))
                && pollAttempts < 120) {
            pollAttempts += 1;
            await delay(350);
            if (pollToken !== activePoll) {
                return;
            }

            try {
                current = await AtomicUI.request(`/home/transaction/${encodeURIComponent(id)}`);
                failedRequests = 0;
                renderWorkflow(current);
            } catch (error) {
                failedRequests += 1;
                if (failedRequests >= 3) {
                    AtomicUI.showToast("Live tracking paused", error.message, "error");
                    return;
                }
            }
        }

        if (pollToken !== activePoll) {
            return;
        }

        if (!terminalStatuses.has(Number(current.status))) {
            AtomicUI.showToast(
                "Live tracking timed out",
                `Transaction #${id} is still ${AtomicUI.statusLabels[current.status] ?? "processing"}.`,
                "error"
            );
            return;
        }

        renderTransactions([current]);
        if (Number(current.status) === 4) {
            AtomicUI.showToast("Transaction completed", `Transaction #${id} was confirmed.`);
        } else if (Number(current.status) === 5) {
            AtomicUI.showToast("Transaction failed", `Transaction #${id} did not pass processing.`, "error");
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = document.querySelector("#submit-transaction");
        const params = new URLSearchParams({
            debit_account_number: document.querySelector("#debit-account").value.trim(),
            credit_account_number: document.querySelector("#credit-account").value.trim(),
            amount: document.querySelector("#transaction-amount").value
        });

        try {
            AtomicUI.setButtonLoading(button, true, "Submitting…");
            const createdTransaction = await AtomicUI.request(`/home/transaction/submit?${params}`, {
                method: "POST"
            });
            renderWorkflow(createdTransaction);
            AtomicUI.showToast(
                "Transaction created",
                `Transaction #${transactionId(createdTransaction)} is now being processed.`
            );
            form.reset();
            void followTransaction(createdTransaction);
        } catch (error) {
            AtomicUI.showToast("Submission failed", error.message, "error");
        } finally {
            AtomicUI.setButtonLoading(button, false);
        }
    });

    fetchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = document.querySelector("#fetch-transactions");

        try {
            const path = createSearchRequest();
            AtomicUI.setButtonLoading(button, true, "Fetching…");
            resultSummary.textContent = "Loading matching transactions…";
            resultContainer.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">…</span>
                        <h3>Fetching transactions</h3>
                    </div>
                </div>
            `;
            const payload = await AtomicUI.request(path);
            renderTransactions(normaliseTransactions(payload));
        } catch (error) {
            resultSummary.textContent = "The search could not be completed.";
            resultContainer.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">!</span>
                        <h3>Could not fetch transactions</h3>
                        <p>${AtomicUI.escapeHtml(error.message)}</p>
                    </div>
                </div>
            `;
            AtomicUI.showToast("Fetch failed", error.message, "error");
        } finally {
            AtomicUI.setButtonLoading(button, false);
        }
    });

    searchMode.addEventListener("change", updateModeFields);
    updateModeFields();
})();
