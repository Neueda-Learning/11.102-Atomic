(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    if (!user) {
        return;
    }

    AtomicApi.populateUser(user);
    AtomicApi.bindLogout();

    const queue = [];
    let nextClientId = 1;
    let submitting = false;

    const form = document.querySelector("#transaction-form");
    const addButton = document.querySelector("#add-transaction");
    const submitQueueButton = document.querySelector("#submit-queue");
    const clearQueueButton = document.querySelector("#clear-queue");
    const formMessage = document.querySelector("#transaction-message");
    const queueMessage = document.querySelector("#queue-message");
    const debitAccountInput = document.querySelector("#debit-account");
    const creditAccountInput = document.querySelector("#credit-account");
    const amountInput = document.querySelector("#amount");
    const repeatCountInput = document.querySelector("#repeat-count");
    const creditFeedback = document.querySelector("#credit-feedback");
    const amountFeedback = document.querySelector("#amount-feedback");
    const repeatFeedback = document.querySelector("#repeat-feedback");
    const processingModeInputs = Array.from(
        document.querySelectorAll('input[name="processing-mode"]')
    );
    const scheduleField = document.querySelector("#schedule-field");
    const processingTimeInput = document.querySelector("#processing-time");
    const processingTimeFeedback = document.querySelector("#processing-time-feedback");

    debitAccountInput.value = user.accountNumber;

    function queuedTotal() {
        return queue.reduce((total, item) => total + Number(item.amount), 0);
    }

    function setFieldFeedback(element, text, isError) {
        element.textContent = text;
        element.classList.toggle("field-note--error", Boolean(isError));
        element.classList.toggle("field-note--success", !isError && Boolean(text));
    }

    function scheduledModeSelected() {
        return document.querySelector('input[name="processing-mode"]:checked')
            ?.value === "scheduled";
    }

    function toLocalMinuteValue(date) {
        const pad = (value) => String(value).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
            + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function earliestSelectableMinute() {
        const threshold = Date.now() + 60_000;
        const candidate = new Date(threshold);
        candidate.setSeconds(59, 0);

        if (candidate.getTime() < threshold) {
            candidate.setMinutes(candidate.getMinutes() + 1);
        }

        candidate.setSeconds(0, 0);
        return candidate;
    }

    function refreshProcessingTimeMinimum() {
        const minimum = toLocalMinuteValue(earliestSelectableMinute());
        processingTimeInput.min = minimum;
        return minimum;
    }

    function validateCredit(showFeedback) {
        const digitsOnly = creditAccountInput.value.replace(/\D+/g, "");
        creditAccountInput.value = digitsOnly;

        if (!digitsOnly) {
            if (showFeedback) {
                setFieldFeedback(creditFeedback, "Enter a destination account.", true);
            }
            return false;
        }

        if (digitsOnly === String(user.accountNumber)) {
            setFieldFeedback(
                creditFeedback,
                "Choose a destination account other than your own.",
                true
            );
            return false;
        }

        setFieldFeedback(creditFeedback, "This account is ready to receive your transfer.", false);
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

        if (amount > Number(user.balance)) {
            setFieldFeedback(
                amountFeedback,
                "This individual transfer exceeds your current balance.",
                true
            );
            return false;
        }

        setFieldFeedback(amountFeedback, "This amount is ready to add.", false);
        return true;
    }

    function validateRepeatCount(showFeedback) {
        const repeatCount = Number(repeatCountInput.value);

        if (!Number.isSafeInteger(repeatCount) || repeatCount < 1) {
            if (showFeedback) {
                setFieldFeedback(
                    repeatFeedback,
                    "Enter how many times you’d like to repeat this transfer (1 or more).",
                    true
                );
            }
            return false;
        }

        setFieldFeedback(
            repeatFeedback,
            `${repeatCount} separate transaction${repeatCount === 1 ? "" : "s"} will be queued.`,
            false
        );
        return true;
    }

    function validateProcessingTime(showFeedback) {
        if (!scheduledModeSelected()) {
            setFieldFeedback(processingTimeFeedback, "", false);
            return true;
        }

        refreshProcessingTimeMinimum();

        if (!processingTimeInput.value) {
            if (showFeedback) {
                setFieldFeedback(
                    processingTimeFeedback,
                    "Choose a processing date and minute.",
                    true
                );
            }
            return false;
        }

        const selectedTime = new Date(processingTimeInput.value);
        selectedTime.setSeconds(59, 0);

        if (Number.isNaN(selectedTime.getTime())
                || selectedTime.getTime() < Date.now() + 60_000) {
            setFieldFeedback(
                processingTimeFeedback,
                "Choose a time at least one minute from now.",
                true
            );
            return false;
        }

        setFieldFeedback(processingTimeFeedback, "Your transfer is ready to be scheduled.", false);
        return true;
    }

    function refreshPreview() {
        const amount = Number(amountInput.value);
        const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
        const repeatCount = Number(repeatCountInput.value);
        const safeRepeatCount = Number.isSafeInteger(repeatCount) && repeatCount > 0
            ? repeatCount
            : 0;
        const repeatedAmount = safeAmount * safeRepeatCount;

        document.querySelector("#preview-repeat-count").textContent =
            String(safeRepeatCount);
        document.querySelector("#preview-amount").textContent =
            AtomicApi.formatMoney(repeatedAmount);
        document.querySelector("#preview-total").textContent =
            AtomicApi.formatMoney(queuedTotal() + repeatedAmount);
    }

    function syncFormState(showFeedback) {
        const valid = validateCredit(showFeedback)
            && validateAmount(showFeedback)
            && validateRepeatCount(showFeedback)
            && validateProcessingTime(showFeedback);

        refreshPreview();
        addButton.disabled = submitting || !valid;
        return valid;
    }

    function formatProcessingTime(item) {
        if (item.processingMode === "immediate") {
            return "Process now";
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(item.processingTime));
    }

    function submissionLabel(item) {
        if (item.submissionState === "submitting") {
            return '<span class="badge badge--sent">Submitting</span>';
        }
        if (item.submissionState === "submitted") {
            return '<span class="badge badge--created">Submitted</span>';
        }
        if (item.submissionState === "failed") {
            return '<span class="badge badge--failed">Couldn’t submit</span>';
        }
        return "";
    }

    function renderQueue() {
        const container = document.querySelector("#transfer-queue");
        const count = queue.length;
        const total = queuedTotal();

        document.querySelector("#queued-count").textContent = String(count);
        document.querySelector("#queue-count").textContent = String(count);
        document.querySelector("#queued-total").textContent = AtomicApi.formatMoney(total);
        document.querySelector("#queue-summary").textContent = count
            ? `${count} transfer${count === 1 ? "" : "s"} ready · ${AtomicApi.formatMoney(total)}`
            : "Add your first transfer above.";

        clearQueueButton.disabled = submitting || count === 0;
        submitQueueButton.disabled = submitting || count === 0;
        submitQueueButton.textContent = count
            ? `Submit ${count} transfer${count === 1 ? "" : "s"}`
            : "Submit queued transfers";

        if (!count) {
            container.innerHTML = `
                <div class="history-empty">
                    <strong>Your queue is empty</strong>
                    <span>You can add as many destinations and times as you need.</span>
                </div>
            `;
            refreshPreview();
            return;
        }

        container.innerHTML = `
            <ol class="transfer-queue-list">
                ${queue.map((item, index) => `
                    <li>
                        <span class="queue-item__number">${index + 1}</span>
                        <div class="queue-item__details">
                            <strong>${AtomicApi.maskAccount(item.creditAccountNumber)} · ${AtomicApi.formatMoney(item.amount)}</strong>
                            <span>${formatProcessingTime(item)}${item.repeatCount > 1 ? ` · Repeat ${item.repeatNumber} of ${item.repeatCount}` : ""}</span>
                        </div>
                        ${submissionLabel(item)}
                        <button class="queue-remove" type="button"
                                data-remove-client-id="${item.clientId}"
                                aria-label="Remove transfer ${index + 1}"
                                ${submitting ? "disabled" : ""}>Remove</button>
                    </li>
                `).join("")}
            </ol>
        `;

        refreshPreview();
    }

    function updateProcessingMode() {
        const scheduled = scheduledModeSelected();
        scheduleField.hidden = !scheduled;
        processingTimeInput.required = scheduled;

        if (scheduled && !processingTimeInput.value) {
            processingTimeInput.value = refreshProcessingTimeMinimum();
        }

        syncFormState(false);
    }

    function createQueueItem(repeatNumber, repeatCount) {
        const processingMode = scheduledModeSelected()
            ? "scheduled"
            : "immediate";
        let processingTime = null;
        let requestedProcessingInstant = null;

        if (processingMode === "scheduled") {
            const selectedTime = new Date(processingTimeInput.value);
            requestedProcessingInstant = selectedTime.toISOString();
            selectedTime.setSeconds(59, 0);
            processingTime = selectedTime.toISOString();
        }

        return {
            clientId: nextClientId++,
            debitAccountNumber: String(user.accountNumber),
            creditAccountNumber: creditAccountInput.value.trim(),
            amount: Number(amountInput.value),
            processingMode,
            processingTime,
            requestedProcessingInstant,
            repeatNumber,
            repeatCount,
            queuedAt: Date.now(),
            submissionState: "waiting"
        };
    }

    function resetEntryFields() {
        creditAccountInput.value = "";
        amountInput.value = "";
        repeatCountInput.value = "1";
        setFieldFeedback(creditFeedback, "", false);
        setFieldFeedback(amountFeedback, "", false);
        setFieldFeedback(repeatFeedback, "", false);
        refreshPreview();
        syncFormState(false);
        creditAccountInput.focus();
    }

    function transactionMatches(item, transaction) {
        return String(transaction.creditAccountNumber)
                === String(item.creditAccountNumber)
            && Math.abs(Number(transaction.amount) - Number(item.amount)) < 0.005;
    }

    async function locateNewTransaction(item, knownIds) {
        const transactions = await AtomicApi.fetchTransactionsForDebit(user.accountNumber);
        const match = transactions
            .filter((transaction) => {
                const id = String(AtomicApi.transactionId(transaction));
                return !knownIds.has(id) && transactionMatches(item, transaction);
            })
            .sort((left, right) =>
                Number(AtomicApi.transactionId(right))
                - Number(AtomicApi.transactionId(left)))[0];

        if (!match) {
            return null;
        }

        knownIds.add(String(AtomicApi.transactionId(match)));
        return match;
    }

    async function submitOne(item, knownIds) {
        const params = new URLSearchParams({
            credit_account_number: item.creditAccountNumber,
            amount: String(item.amount)
        });

        if (item.requestedProcessingInstant) {
            params.set("processing_time", item.requestedProcessingInstant);
        }

        const endpoint = item.processingMode === "scheduled"
            ? "/home/transaction/schedule"
            : "/home/transaction/submit";

        try {
            const response = await AtomicApi.request(
                `${endpoint}?${params}`,
                { method: "POST" }
            );

            item.backendMessage = String(response ?? "");
            const idMatch = item.backendMessage.match(/Transaction ID:\s*(\d+)/i);

            if (idMatch) {
                item.transactionId = idMatch[1];
                knownIds.add(String(idMatch[1]));
            } else {
                const transaction = await locateNewTransaction(item, knownIds);
                if (transaction) {
                    item.transactionId = String(AtomicApi.transactionId(transaction));
                    item.status = Number(transaction.status);
                    item.transaction = transaction;
                }
            }

            item.submissionState = "submitted";
        } catch (error) {
            const idMatch = String(error.message || "").match(/Transaction ID:\s*(\d+)/i);

            if (idMatch) {
                item.transactionId = idMatch[1];
                item.status = 5;
                item.submissionState = "submitted";
                knownIds.add(String(idMatch[1]));
            } else {
                item.status = 5;
                item.submissionState = "failed";
            }

            item.submissionError = error.message || "We couldn’t submit this transfer. Please try again.";
        }
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        formMessage.classList.remove("form-message--error");

        if (!syncFormState(true)) {
            formMessage.classList.add("form-message--error");
            formMessage.textContent = "Please check the highlighted fields before adding this transfer.";
            return;
        }

        const repeatCount = Number(repeatCountInput.value);
        for (let repeatNumber = 1; repeatNumber <= repeatCount; repeatNumber += 1) {
            queue.push(createQueueItem(repeatNumber, repeatCount));
        }
        formMessage.textContent = `${repeatCount} transfer${repeatCount === 1 ? "" : "s"} added. Add another destination or submit your queue.`;
        renderQueue();
        resetEntryFields();
    });

    document.querySelector("#transfer-queue").addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-client-id]");
        if (!button || submitting) {
            return;
        }

        const index = queue.findIndex((item) =>
            String(item.clientId) === String(button.dataset.removeClientId));
        if (index >= 0) {
            queue.splice(index, 1);
            renderQueue();
            syncFormState(false);
        }
    });

    clearQueueButton.addEventListener("click", () => {
        if (submitting) {
            return;
        }
        queue.length = 0;
        queueMessage.textContent = "";
        renderQueue();
        syncFormState(false);
    });

    submitQueueButton.addEventListener("click", async () => {
        if (!queue.length || submitting) {
            return;
        }

        submitting = true;
        AtomicApi.clearTransactionState();
        renderQueue();

        let knownTransactions = [];
        try {
            knownTransactions = await AtomicApi.fetchTransactionsForDebit(user.accountNumber);
        } catch (error) {
            // Submission can still continue; IDs from scheduled responses remain usable.
        }

        const knownIds = new Set(
            knownTransactions.map((transaction) =>
                String(AtomicApi.transactionId(transaction)))
        );

        for (let index = 0; index < queue.length; index += 1) {
            const item = queue[index];
            item.submissionState = "submitting";
            item.submittedAt = Date.now();
            queueMessage.textContent = `Submitting transfer ${index + 1} of ${queue.length}…`;
            submitQueueButton.textContent = `Submitting ${index + 1} of ${queue.length}…`;
            renderQueue();

            // Deliberately awaited: every transaction hits the endpoint separately.
            await submitOne(item, knownIds);
            AtomicApi.setPendingBatch(queue);
            renderQueue();
        }

        queueMessage.textContent = "Your transfers have been submitted. We’re opening the progress page…";
        AtomicApi.setPendingBatch(queue);
        location.assign("/processing.html");
    });

    creditAccountInput.addEventListener("input", () => syncFormState(true));
    amountInput.addEventListener("input", () => syncFormState(true));
    repeatCountInput.addEventListener("input", () => syncFormState(true));
    processingTimeInput.addEventListener("input", () => syncFormState(true));
    processingModeInputs.forEach((input) =>
        input.addEventListener("change", updateProcessingMode));

    updateProcessingMode();
    renderQueue();
})();
