(function () {
    "use strict";

    const mockAlerts = [
        { id: 101, title: "High-value transfer", severity: 4, status: 0, alertTime: "2026-08-02T04:15:00+05:30", resolutionTime: null },
        { id: 102, title: "Unusual transaction hour", severity: 2, status: 1, alertTime: "2026-08-02T03:05:15+05:30", resolutionTime: null },
        { id: 103, title: "Account velocity threshold", severity: 3, status: 0, alertTime: "2026-08-02T00:55:30+05:30", resolutionTime: null },
        { id: 104, title: "Blacklisted account match", severity: 4, status: 2, alertTime: "2026-08-01T15:45:23+05:30", resolutionTime: 1200000 },
        { id: 105, title: "International limit exceeded", severity: 3, status: 1, alertTime: "2026-08-01T14:30:00+05:30", resolutionTime: null },
        { id: 106, title: "Repeated failed transfers", severity: 2, status: 2, alertTime: "2026-07-31T09:15:00+05:30", resolutionTime: 3600000 }
    ];

    const statusConfig = {
        0: ["Open", "danger"],
        1: ["Acknowledged", "warning"],
        2: ["Resolved", "success"]
    };

    const table = document.querySelector("#alert-table");
    const summary = document.querySelector("#alert-summary");
    const filter = document.querySelector("#alert-filter");
    const alertSelect = document.querySelector("#alert-id");
    const alertChartCanvas = document.querySelector("#alert-status-chart");
    const alertChartEmpty = document.querySelector("#alert-chart-empty");
    let fetched = false;
    let alertChart = null;

    function alertStatusBadge(status) {
        const [label, style] = statusConfig[status] ?? ["Unknown", "info"];
        return `<span class="badge badge--${style}">${label}</span>`;
    }

    function populateAlertSelect() {
        alertSelect.innerHTML = mockAlerts.map((alert) => `
            <option value="${alert.id}">#${alert.id} · ${AtomicUI.escapeHtml(alert.title)}</option>
        `).join("");
    }

    function getFilteredAlerts() {
        const selectedStatus = filter.value;
        return selectedStatus === "all"
            ? mockAlerts
            : mockAlerts.filter((alert) => String(alert.status) === selectedStatus);
    }

    function renderAlertChart(alerts) {
        if (!alertChartCanvas || !alertChartEmpty) {
            return;
        }

        if (typeof window.Chart !== "function") {
            alertChartCanvas.hidden = true;
            alertChartEmpty.hidden = false;
            alertChartEmpty.textContent = "Chart library is unavailable.";
            return;
        }

        const counts = [0, 0, 0];
        alerts.forEach((alert) => {
            if (alert.status >= 0 && alert.status <= 2) {
                counts[alert.status] += 1;
            }
        });

        const total = counts.reduce((sum, count) => sum + count, 0);
        if (total === 0) {
            if (alertChart) {
                alertChart.destroy();
                alertChart = null;
            }
            alertChartCanvas.hidden = true;
            alertChartEmpty.hidden = false;
            alertChartEmpty.textContent = "No chart data available yet.";
            return;
        }

        alertChartCanvas.hidden = false;
        alertChartEmpty.hidden = true;

        if (!alertChart) {
            alertChart = new window.Chart(alertChartCanvas, {
                type: "pie",
                data: {
                    labels: ["Open", "Acknowledged", "Resolved"],
                    datasets: [{
                        data: counts,
                        backgroundColor: ["#a53b3b", "#9a5f08", "#0b655b"],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom"
                        }
                    }
                }
            });
            return;
        }

        alertChart.data.datasets[0].data = counts;
        alertChart.update();
    }

    function renderAlertsTable(alerts) {
        summary.innerHTML = `<strong>${alerts.length}</strong> of ${mockAlerts.length} alerts shown`;

        if (!alerts.length) {
            table.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">0</span>
                        <h3>No alerts in this status</h3>
                        <p>Select another filter to see the rest of the queue.</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = alerts.map((alert) => `
            <tr>
                <td class="cell-strong">#${alert.id}</td>
                <td class="cell-strong">${AtomicUI.escapeHtml(alert.title)}</td>
                <td><span class="severity severity--${alert.severity}">${alert.severity}</span></td>
                <td>${alertStatusBadge(alert.status)}</td>
                <td>${AtomicUI.formatDate(alert.alertTime)}</td>
                <td>${alert.resolutionTime ? `${Math.round(alert.resolutionTime / 60000)} min` : "—"}</td>
            </tr>
        `).join("");

        table.innerHTML = `
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Alert ID</th>
                            <th>Signal</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Detected</th>
                            <th>Resolution</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function syncAlertsView() {
        if (!fetched) {
            return;
        }
        const alerts = getFilteredAlerts();
        renderAlertsTable(alerts);
        renderAlertChart(alerts);
    }

    document.querySelector("#fetch-alerts").addEventListener("click", (event) => {
        AtomicUI.setButtonLoading(event.currentTarget, true, "Fetching…");
        window.setTimeout(() => {
            fetched = true;
            syncAlertsView();
            AtomicUI.setButtonLoading(event.currentTarget, false);
            AtomicUI.showToast("Alerts fetched", `${mockAlerts.length} mock alerts loaded.`);
        }, 350);
    });

    filter.addEventListener("change", syncAlertsView);

    document.querySelector("#alert-update-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = document.querySelector("#update-alert");
        const alertId = Number(alertSelect.value);
        const newStatus = Number(document.querySelector("#alert-status").value);
        const alert = mockAlerts.find((record) => record.id === alertId);

        try {
            AtomicUI.setButtonLoading(button, true, "Updating…");
            const params = new URLSearchParams({ alertId: String(alertId), status: String(newStatus) });
            await AtomicUI.request(`/home/alert/update?${params}`, { method: "POST" });
            alert.status = newStatus;
            if (newStatus === 2 && !alert.resolutionTime) {
                alert.resolutionTime = Date.now() - new Date(alert.alertTime).getTime();
            }
            fetched = true;
            syncAlertsView();
            AtomicUI.showToast("Alert updated", `Alert #${alertId} is now ${statusConfig[newStatus][0].toLowerCase()}.`);
        } catch (error) {
            AtomicUI.showToast("Update failed", error.message, "error");
        } finally {
            AtomicUI.setButtonLoading(button, false);
        }
    });

    populateAlertSelect();
})();
