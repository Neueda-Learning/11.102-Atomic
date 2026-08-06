(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    if (!user) {
        return;
    }

    AtomicApi.populateUser(user);
    AtomicApi.bindLogout();

    let dashboardAlerts = [];
    let alertRules = new Map();
    let closingDashboardAlerts = false;

    const dashboardAlertList = document.querySelector("#dashboard-alert-list");
    const dashboardAlertSummary = document.querySelector("#dashboard-alert-summary");
    const dashboardAlertFilter = document.querySelector("#dashboard-alert-filter");

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function alertRuleId(rule) {
        return rule.alertID ?? rule.alertId ?? rule.alert_id;
    }

    function alertRuleName(rule) {
        return String(rule.alertName ?? rule.alert_name ?? "Monitoring rule");
    }

    function alertRuleSeverity(rule) {
        return Number(rule.alertSeverity ?? rule.alert_severity ?? 1);
    }

    function alertDetectedAt(alert) {
        const date = new Date(alert.alertTime);
        if (Number.isNaN(date.getTime())) {
            return "Detection time unavailable";
        }
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function filteredDashboardAlerts() {
        const selectedStatus = dashboardAlertFilter.value;
        return dashboardAlerts
            .filter((alert) => selectedStatus === "all"
                || String(alert.status) === selectedStatus)
            .sort((left, right) =>
                new Date(right.alertTime).getTime() - new Date(left.alertTime).getTime())
            .slice(0, 6);
    }

    function renderDashboardAlerts() {
        const opened = dashboardAlerts.filter((alert) => Number(alert.status) === 1).length;
        const acknowledged = dashboardAlerts.filter((alert) => Number(alert.status) === 2).length;
        const closed = dashboardAlerts.filter((alert) => Number(alert.status) === 3).length;
        const visibleAlerts = filteredDashboardAlerts();

        document.querySelector("#dashboard-alert-opened").textContent = String(opened);
        document.querySelector("#dashboard-alert-acknowledged").textContent = String(acknowledged);
        document.querySelector("#dashboard-alert-closed").textContent = String(closed);
        dashboardAlertSummary.textContent = visibleAlerts.length
            ? `${visibleAlerts.length} recent alert${visibleAlerts.length === 1 ? "" : "s"} shown.`
            : "No alerts match this status.";

        if (!visibleAlerts.length) {
            dashboardAlertList.innerHTML = `
                <div class="history-empty">
                    <strong>No monitoring alerts here</strong>
                    <span>New transaction signals will appear automatically.</span>
                </div>
            `;
            return;
        }

        dashboardAlertList.innerHTML = visibleAlerts.map((alert) => {
            const rule = alertRules.get(String(alert.ruleId));
            const status = AtomicApi.alertStatusInfo(alert.status);
            const severity = rule ? alertRuleSeverity(rule) : 1;
            const encodedKey = encodeURIComponent(AtomicApi.alertKey(alert));
            const canAcknowledge = Number(alert.status) === 1;

            return `
                <button class="dashboard-alert-card" type="button"
                        data-alert-key="${encodedKey}"
                        ${canAcknowledge ? "" : "disabled"}>
                    <span class="dashboard-alert-card__severity dashboard-alert-card__severity--${severity}"
                          aria-label="Severity ${severity}">${severity}</span>
                    <span class="dashboard-alert-card__copy">
                        <strong>${escapeHtml(rule ? alertRuleName(rule) : `Rule #${alert.ruleId}`)}</strong>
                        <small>${escapeHtml(alertDetectedAt(alert))} · Account ${escapeHtml(user.accountNumber)}</small>
                    </span>
                    <span class="badge badge--alert-${status.className}">${status.label}</span>
                </button>
            `;
        }).join("");
    }

    async function loadDashboardAlerts(showLoading = false) {
        const button = document.querySelector("#refresh-alerts");
        if (showLoading) {
            AtomicApi.setButtonLoading(button, true, "Refreshing…");
        }

        try {
            const [alerts, rules] = await Promise.all([
                AtomicApi.fetchAlerts(user.accountNumber),
                alertRules.size ? Promise.resolve([]) : AtomicApi.fetchAlertRules()
            ]);
            dashboardAlerts = alerts;
            if (rules.length) {
                alertRules = new Map(rules.map((rule) => [String(alertRuleId(rule)), rule]));
            }
            renderDashboardAlerts();
        } catch (error) {
            dashboardAlertSummary.textContent = "Alerts could not be loaded.";
            dashboardAlertList.innerHTML = `
                <p class="form-message form-message--error">Please refresh and try again.</p>
            `;
        } finally {
            if (showLoading) {
                AtomicApi.setButtonLoading(button, false);
            }
        }
    }

    dashboardAlertList.addEventListener("click", async (event) => {
        const card = event.target.closest("[data-alert-key]");
        if (!card || card.disabled) {
            return;
        }

        const key = decodeURIComponent(card.dataset.alertKey);
        const index = dashboardAlerts.findIndex((alert) => AtomicApi.alertKey(alert) === key);
        if (index < 0 || Number(dashboardAlerts[index].status) !== 1) {
            return;
        }

        card.disabled = true;
        dashboardAlertSummary.textContent = "Acknowledging alert…";
        try {
            dashboardAlerts[index] = await AtomicApi.acknowledgeAlert(dashboardAlerts[index]);
            renderDashboardAlerts();
        } catch (error) {
            dashboardAlertSummary.textContent = error.message || "The alert could not be acknowledged.";
            card.disabled = false;
        }
    });

    dashboardAlertFilter.addEventListener("change", renderDashboardAlerts);
    document.querySelector("#refresh-alerts")
        .addEventListener("click", () => loadDashboardAlerts(true));

    window.addEventListener("pagehide", () => {
        if (closingDashboardAlerts) {
            return;
        }
        closingDashboardAlerts = true;
        dashboardAlerts = dashboardAlerts.map((alert) =>
            Number(alert.status) === 2
                ? AtomicApi.closeAlertKeepalive(alert)
                : alert);
    });

    const histories = {
        debit: {
            items: [],
            container: document.querySelector("#debit-transfers"),
            summary: document.querySelector("#debit-summary"),
            form: document.querySelector("#debit-filter"),
            from: document.querySelector("#debit-from"),
            to: document.querySelector("#debit-to")
        },
        credit: {
            items: [],
            container: document.querySelector("#credit-transfers"),
            summary: document.querySelector("#credit-summary"),
            form: document.querySelector("#credit-filter"),
            from: document.querySelector("#credit-from"),
            to: document.querySelector("#credit-to")
        }
    };

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "No processing date";
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function dateRange(history) {
        const from = history.from.value
            ? new Date(`${history.from.value}T00:00:00`)
            : null;
        const to = history.to.value
            ? new Date(`${history.to.value}T23:59:59.999`)
            : null;

        if (from && to && from > to) {
            throw new Error("The From date cannot be later than the To date.");
        }

        return { from, to };
    }

    function filteredItems(type) {
        const history = histories[type];
        const range = dateRange(history);

        return history.items
            .filter((transaction) => {
                if (!range.from && !range.to) {
                    return true;
                }

                const processingTime = new Date(transaction.timeDate);
                if (Number.isNaN(processingTime.getTime())) {
                    return false;
                }

                return (!range.from || processingTime >= range.from)
                    && (!range.to || processingTime <= range.to);
            })
            .sort((left, right) => {
                const timeDifference = new Date(right.timeDate) - new Date(left.timeDate);
                if (timeDifference !== 0) {
                    return timeDifference;
                }
                return Number(AtomicApi.transactionId(right))
                    - Number(AtomicApi.transactionId(left));
            });
    }

    function renderHistory(type) {
        const history = histories[type];
        let items;

        try {
            items = filteredItems(type);
        } catch (error) {
            history.summary.textContent = error.message;
            history.container.innerHTML =
                '<p class="form-message form-message--error">Correct the selected date range.</p>';
            return;
        }

        const direction = type === "debit" ? "sent" : "received";
        history.summary.textContent = `Showing ${items.length} of ${history.items.length} ${direction} transaction${history.items.length === 1 ? "" : "s"}.`;

        if (!items.length) {
            history.container.innerHTML = `
                <div class="history-empty">
                    <strong>No ${direction} transactions in this period</strong>
                    <span>Clear or widen the calendar range to see more activity.</span>
                </div>
            `;
            return;
        }

        const rows = items.map((transaction) => {
            const status = AtomicApi.statusInfo(transaction.status);
            const id = AtomicApi.transactionId(transaction);
            const counterparty = type === "debit"
                ? transaction.creditAccountNumber
                : transaction.debitAccountNumber;
            const sign = type === "debit" ? "−" : "+";

            return `
                <li>
                    <div class="history-transfer__identity">
                        <strong>#${id} · ${type === "debit" ? "To" : "From"} ${AtomicApi.maskAccount(counterparty)}</strong>
                        <span>${formatDate(transaction.timeDate)}</span>
                    </div>
                    <span class="history-amount history-amount--${type}">${sign}${AtomicApi.formatMoney(transaction.amount)}</span>
                    <span class="badge badge--${status.className}">${status.label}</span>
                </li>
            `;
        }).join("");

        history.container.innerHTML = `<ul class="history-transfers-list">${rows}</ul>`;
    }

    async function loadHistory(type) {
        const history = histories[type];

        try {
            history.items = type === "debit"
                ? await AtomicApi.fetchTransactionsForDebit(user.accountNumber)
                : await AtomicApi.fetchTransactionsForCredit(user.accountNumber);
            renderHistory(type);
        } catch (error) {
            history.summary.textContent = `Could not load ${type === "debit" ? "sent" : "received"} transactions.`;
            history.container.innerHTML =
                '<p class="form-message form-message--error">Please refresh and try again.</p>';
        }
    }

    async function loadBothHistories(showLoading = true) {
        const button = document.querySelector("#refresh-history");
        if (button && showLoading) {
            AtomicApi.setButtonLoading(button, true, "Refreshing…");
        }

        await Promise.all([
            loadHistory("debit"),
            loadHistory("credit")
        ]);

        if (button && showLoading) {
            AtomicApi.setButtonLoading(button, false);
        }
    }

    Object.entries(histories).forEach(([type, history]) => {
        history.form.addEventListener("submit", (event) => {
            event.preventDefault();
            renderHistory(type);
        });
    });

    document.querySelectorAll("[data-clear-filter]").forEach((button) => {
        button.addEventListener("click", () => {
            const type = button.dataset.clearFilter;
            histories[type].form.reset();
            renderHistory(type);
        });
    });

    document.querySelector("#refresh-history")
        .addEventListener("click", () => loadBothHistories(true));

    void loadBothHistories();
    void loadDashboardAlerts();

    // Keep pending scheduled statuses reasonably fresh while the dashboard is open.
    window.setInterval(() => loadBothHistories(false), 15_000);
    window.setInterval(() => loadDashboardAlerts(false), 10_000);
})();
