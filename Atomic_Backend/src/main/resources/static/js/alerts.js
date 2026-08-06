(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    if (!user) {
        return;
    }

    AtomicApi.bindLogout();

    const accountInput = document.querySelector("#alert-account");
    const statusFilter = document.querySelector("#alert-filter");
    const ruleFilter = document.querySelector("#alert-rule-filter");
    const filterForm = document.querySelector("#alert-filter-form");
    const table = document.querySelector("#alert-table");
    const summary = document.querySelector("#alert-summary");
    const refreshButton = document.querySelector("#fetch-alerts");
    const chartCanvas = document.querySelector("#alert-status-chart");
    const chartEmpty = document.querySelector("#alert-chart-empty");

    let alerts = [];
    let rules = new Map();
    let alertChart = null;
    let currentAccount = String(user.accountNumber);
    let fetching = false;
    let closingAlerts = false;

    accountInput.value = currentAccount;

    function ruleId(rule) {
        return rule.alertID ?? rule.alertId ?? rule.alert_id;
    }

    function ruleName(rule) {
        return String(rule.alertName ?? rule.alert_name ?? "Monitoring rule");
    }

    function ruleSeverity(rule) {
        const severity = Number(rule.alertSeverity ?? rule.alert_severity ?? 1);
        return severity >= 1 && severity <= 4 ? severity : 1;
    }

    function formatTime(value, fallback = "—") {
        if (!value) {
            return fallback;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return fallback;
        }
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(date);
    }

    function populateRuleFilter() {
        const selectedRule = ruleFilter.value;
        const options = Array.from(rules.values())
            .sort((left, right) => Number(ruleId(left)) - Number(ruleId(right)))
            .map((rule) => `
                <option value="${AtomicUI.escapeHtml(String(ruleId(rule)))}">
                    ${AtomicUI.escapeHtml(ruleName(rule))}
                </option>
            `).join("");

        ruleFilter.innerHTML = `<option value="all">All rules</option>${options}`;
        if (Array.from(ruleFilter.options).some((option) => option.value === selectedRule)) {
            ruleFilter.value = selectedRule;
        }
    }

    function filteredAlerts() {
        return alerts
            .filter((alert) => statusFilter.value === "all"
                || String(alert.status) === statusFilter.value)
            .filter((alert) => ruleFilter.value === "all"
                || String(alert.ruleId) === ruleFilter.value)
            .sort((left, right) => {
                const timeDifference = new Date(right.alertTime).getTime()
                    - new Date(left.alertTime).getTime();
                return Number.isFinite(timeDifference) && timeDifference !== 0
                    ? timeDifference
                    : Number(right.ruleId) - Number(left.ruleId);
            });
    }

    function updateMetrics() {
        document.querySelector("#alert-opened-count").textContent = String(
            alerts.filter((alert) => Number(alert.status) === 1).length
        );
        document.querySelector("#alert-acknowledged-count").textContent = String(
            alerts.filter((alert) => Number(alert.status) === 2).length
        );
        document.querySelector("#alert-closed-count").textContent = String(
            alerts.filter((alert) => Number(alert.status) === 3).length
        );
    }

    function chartColours() {
        return document.documentElement.dataset.colourMode === "accessible"
            ? ["#d55e00", "#e69f00", "#009e73"]
            : ["#a53b3b", "#9a5f08", "#0b655b"];
    }

    function renderChart(visibleAlerts) {
        const counts = [1, 2, 3].map((status) =>
            visibleAlerts.filter((alert) => Number(alert.status) === status).length);
        const total = counts.reduce((sum, count) => sum + count, 0);

        if (typeof window.Chart !== "function" || total === 0) {
            if (alertChart) {
                alertChart.destroy();
                alertChart = null;
            }
            chartCanvas.hidden = true;
            chartEmpty.hidden = false;
            chartEmpty.textContent = total
                ? "The chart library is unavailable."
                : "No alert data matches these filters.";
            return;
        }

        chartCanvas.hidden = false;
        chartEmpty.hidden = true;

        if (!alertChart) {
            alertChart = new window.Chart(chartCanvas, {
                type: "doughnut",
                data: {
                    labels: ["Opened", "Acknowledged", "Closed"],
                    datasets: [{
                        data: counts,
                        backgroundColor: chartColours(),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "62%",
                    plugins: {
                        legend: { position: "bottom" }
                    }
                }
            });
            return;
        }

        alertChart.data.datasets[0].data = counts;
        alertChart.data.datasets[0].backgroundColor = chartColours();
        alertChart.update();
    }

    function renderAlertQueue(visibleAlerts) {
        summary.textContent = `${visibleAlerts.length} of ${alerts.length} alert${alerts.length === 1 ? "" : "s"} shown for account ${currentAccount}.`;

        if (!visibleAlerts.length) {
            table.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">0</span>
                        <h3>No alerts match these filters</h3>
                        <p>Try another account, status, or rule.</p>
                    </div>
                </div>
            `;
            return;
        }

        table.innerHTML = `
            <div class="alert-card-list">
                ${visibleAlerts.map((alert) => {
                    const rule = rules.get(String(alert.ruleId));
                    const status = AtomicApi.alertStatusInfo(alert.status);
                    const severity = rule ? ruleSeverity(rule) : 1;
                    const opened = Number(alert.status) === 1;
                    const key = encodeURIComponent(AtomicApi.alertKey(alert));

                    return `
                        <button class="alert-card ${opened ? "alert-card--actionable" : ""}"
                                type="button" data-alert-key="${key}"
                                ${opened ? "" : "disabled"}>
                            <span class="severity severity--${severity}" aria-label="Severity ${severity}">${severity}</span>
                            <span class="alert-card__main">
                                <strong>${AtomicUI.escapeHtml(rule ? ruleName(rule) : `Rule #${alert.ruleId}`)}</strong>
                                <small>Rule #${AtomicUI.escapeHtml(String(alert.ruleId ?? "—"))} · Account ${AtomicUI.escapeHtml(alert.accountNumber || currentAccount)}</small>
                                <small>Detected ${AtomicUI.escapeHtml(formatTime(alert.alertTime, "at an unknown time"))}</small>
                            </span>
                            <span class="alert-card__status">
                                <span class="badge badge--${status.className}">${status.label}</span>
                                <small>${opened ? "Select to acknowledge" : Number(alert.status) === 2 ? "Closes when this page is left" : `Closed ${AtomicUI.escapeHtml(formatTime(alert.resolutionTime))}`}</small>
                            </span>
                        </button>
                    `;
                }).join("")}
            </div>
        `;
    }

    function render() {
        const visibleAlerts = filteredAlerts();
        updateMetrics();
        renderChart(visibleAlerts);
        renderAlertQueue(visibleAlerts);
    }

    async function loadAlerts(showLoading = false) {
        if (fetching) {
            return;
        }
        fetching = true;
        if (showLoading) {
            AtomicUI.setButtonLoading(refreshButton, true, "Refreshing…");
        }

        try {
            const [fetchedAlerts, fetchedRules] = await Promise.all([
                AtomicApi.fetchAlerts(currentAccount),
                rules.size ? Promise.resolve([]) : AtomicApi.fetchAlertRules()
            ]);
            alerts = fetchedAlerts;
            if (fetchedRules.length) {
                rules = new Map(fetchedRules.map((rule) => [String(ruleId(rule)), rule]));
                populateRuleFilter();
            }
            render();
        } catch (error) {
            summary.textContent = "Alerts could not be loaded.";
            table.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">!</span>
                        <h3>Could not reach the alert service</h3>
                        <p>Refresh the page or try again in a moment.</p>
                    </div>
                </div>
            `;
        } finally {
            fetching = false;
            if (showLoading) {
                AtomicUI.setButtonLoading(refreshButton, false);
            }
        }
    }

    table.addEventListener("click", async (event) => {
        const card = event.target.closest("[data-alert-key]");
        if (!card || card.disabled) {
            return;
        }

        const key = decodeURIComponent(card.dataset.alertKey);
        const index = alerts.findIndex((alert) => AtomicApi.alertKey(alert) === key);
        if (index < 0 || Number(alerts[index].status) !== 1) {
            return;
        }

        card.disabled = true;
        summary.textContent = "Acknowledging the selected alert…";
        try {
            alerts[index] = await AtomicApi.acknowledgeAlert(alerts[index]);
            render();
            AtomicUI.showToast("Alert acknowledged", "The alert will close when you leave this page.");
        } catch (error) {
            card.disabled = false;
            summary.textContent = error.message || "The alert could not be acknowledged.";
            AtomicUI.showToast("Acknowledgement failed", summary.textContent, "error");
        }
    });

    accountInput.addEventListener("input", () => {
        accountInput.value = accountInput.value.replace(/\D+/g, "");
    });

    filterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!accountInput.value) {
            accountInput.focus();
            return;
        }
        const nextAccount = accountInput.value;
        if (nextAccount !== currentAccount) {
            currentAccount = nextAccount;
            void loadAlerts(true);
            return;
        }
        render();
    });

    statusFilter.addEventListener("change", render);
    ruleFilter.addEventListener("change", render);
    refreshButton.addEventListener("click", () => loadAlerts(true));
    document.addEventListener("atomic:colour-mode-change", render);

    window.addEventListener("pagehide", () => {
        if (closingAlerts) {
            return;
        }
        closingAlerts = true;
        alerts = alerts.map((alert) =>
            Number(alert.status) === 2
                ? AtomicApi.closeAlertKeepalive(alert)
                : alert);
    });

    void loadAlerts();
    window.setInterval(() => loadAlerts(false), 8_000);
})();
