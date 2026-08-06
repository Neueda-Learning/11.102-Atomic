(function () {
    "use strict";

    const table = document.querySelector("#rule-table");
    const summary = document.querySelector("#rule-summary");
    const filter = document.querySelector("#rule-filter");
    const ruleSelect = document.querySelector("#rule-name");
    const ruleNameInput = document.querySelector("#rule-new-name");
    const statusSelect = document.querySelector("#rule-status");
    const severitySelect = document.querySelector("#rule-severity");
    const updateButton = document.querySelector("#update-rule");
    const ruleChartCanvas = document.querySelector("#rule-severity-chart");
    const ruleChartEmpty = document.querySelector("#rule-chart-empty");
    let rules = [];
    let ruleChart = null;

    function normaliseRule(rule) {
        return {
            id: Number(rule.alertID ?? rule.alertId ?? rule.id),
            name: String(rule.alertName ?? rule.name ?? "Unnamed rule"),
            status: Number(rule.alertStatus ?? rule.status),
            severity: Number(rule.alertSeverity ?? rule.severity)
        };
    }

    function statusBadge(status) {
        return Number(status) === 1
            ? '<span class="badge badge--success">Active</span>'
            : '<span class="badge badge--warning">Inactive</span>';
    }

    function setUpdateEnabled(enabled) {
        [ruleSelect, ruleNameInput, statusSelect, severitySelect, updateButton].forEach((control) => {
            control.disabled = !enabled;
        });
    }

    function populateRuleSelect(preferredId) {
        if (!rules.length) {
            ruleSelect.innerHTML = '<option value="">No rules available</option>';
            setUpdateEnabled(false);
            return;
        }

        ruleSelect.innerHTML = rules.map((rule) => `
            <option value="${rule.id}">${AtomicUI.escapeHtml(rule.name)}</option>
        `).join("");

        if (preferredId && rules.some((rule) => rule.id === Number(preferredId))) {
            ruleSelect.value = String(preferredId);
        }
        setUpdateEnabled(true);
        syncFormToRule();
    }

    function syncFormToRule() {
        const rule = rules.find((candidate) => candidate.id === Number(ruleSelect.value));
        if (!rule) {
            return;
        }
        ruleNameInput.value = rule.name;
        statusSelect.value = String(rule.status);
        severitySelect.value = String(rule.severity);
    }

    function getFilteredRules() {
        const selectedStatus = filter.value;
        return selectedStatus === "all"
            ? rules
            : rules.filter((rule) => String(rule.status) === selectedStatus);
    }

    function ruleChartColours() {
        return document.documentElement.dataset.colourMode === "accessible"
            ? ["#009e73", "#0072b2", "#e69f00", "#d55e00"]
            : ["#0b655b", "#245d86", "#9a5f08", "#a53b3b"];
    }

    function renderRuleChart(visibleRules) {
        if (!ruleChartCanvas || !ruleChartEmpty) {
            return;
        }

        if (typeof window.Chart !== "function") {
            ruleChartCanvas.hidden = true;
            ruleChartEmpty.hidden = false;
            ruleChartEmpty.textContent = "We can’t display the chart right now.";
            return;
        }

        const counts = [0, 0, 0, 0];
        visibleRules.forEach((rule) => {
            if (rule.severity >= 1 && rule.severity <= 4) {
                counts[rule.severity - 1] += 1;
            }
        });

        const total = counts.reduce((sum, count) => sum + count, 0);
        if (total === 0) {
            if (ruleChart) {
                ruleChart.destroy();
                ruleChart = null;
            }
            ruleChartCanvas.hidden = true;
            ruleChartEmpty.hidden = false;
            ruleChartEmpty.textContent = "No chart data available yet.";
            return;
        }

        ruleChartCanvas.hidden = false;
        ruleChartEmpty.hidden = true;

        if (!ruleChart) {
            ruleChart = new window.Chart(ruleChartCanvas, {
                type: "bar",
                data: {
                    labels: ["1 - Low", "2 - Medium", "3 - High", "4 - Critical"],
                    datasets: [{
                        label: "Rules",
                        data: counts,
                        backgroundColor: ruleChartColours(),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
            return;
        }

        ruleChart.data.datasets[0].data = counts;
        ruleChart.data.datasets[0].backgroundColor = ruleChartColours();
        ruleChart.update();
    }

    function renderRulesTable(visibleRules) {
        summary.innerHTML = `<strong>${visibleRules.length}</strong> of ${rules.length} rules shown`;

        if (!visibleRules.length) {
            table.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">0</span>
                        <h3>No rules match this filter</h3>
                        <p>Choose another filter to look for a different rule.</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = visibleRules.map((rule) => `
            <tr>
                <td class="cell-strong">#${AtomicUI.escapeHtml(rule.id)}</td>
                <td class="cell-strong">${AtomicUI.escapeHtml(rule.name)}</td>
                <td>${statusBadge(rule.status)}</td>
                <td><span class="severity severity--${rule.severity}">${rule.severity}</span></td>
            </tr>
        `).join("");

        table.innerHTML = `
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rule ID</th>
                            <th>Rule name</th>
                            <th>Status</th>
                            <th>Severity</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function syncRulesView() {
        const visibleRules = getFilteredRules();
        renderRulesTable(visibleRules);
        renderRuleChart(visibleRules);
    }

    async function fetchRules(showNotification = true) {
        const button = document.querySelector("#fetch-rules");
        const selectedRuleId = Number(ruleSelect.value);

        try {
            AtomicUI.setButtonLoading(button, true, "Loading…");
            summary.textContent = "Loading your rules…";
            const payload = await AtomicUI.request("/home/rules");
            rules = (Array.isArray(payload) ? payload : []).map(normaliseRule);
            populateRuleSelect(selectedRuleId);
            syncRulesView();
            if (showNotification) {
                AtomicUI.showToast("Rules loaded", `${rules.length} rule${rules.length === 1 ? " is" : "s are"} ready to review.`);
            }
        } catch (error) {
            setUpdateEnabled(false);
            summary.textContent = "We couldn’t load your rules.";
            table.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">!</span>
                        <h3>We couldn’t load your rules</h3>
                        <p>Please try again in a moment.</p>
                    </div>
                </div>
            `;
            renderRuleChart([]);
            if (showNotification) {
                AtomicUI.showToast("Couldn’t load rules", error.message, "error");
            }
        } finally {
            AtomicUI.setButtonLoading(button, false);
        }
    }

    document.querySelector("#fetch-rules").addEventListener("click", () => fetchRules(true));
    filter.addEventListener("change", syncRulesView);
    document.addEventListener("atomic:colour-mode-change", syncRulesView);
    ruleSelect.addEventListener("change", syncFormToRule);

    document.querySelector("#rule-update-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const ruleId = Number(ruleSelect.value);
        const name = ruleNameInput.value.trim();

        if (!ruleId || !name) {
            AtomicUI.showToast("Update failed", "Select a rule and provide a name.", "error");
            return;
        }

        try {
            AtomicUI.setButtonLoading(updateButton, true, "Updating…");
            const params = new URLSearchParams({
                id: String(ruleId),
                name,
                status: statusSelect.value,
                severity: severitySelect.value
            });
            await AtomicUI.request(`/home/rules/update?${params}`, { method: "PUT" });
            await fetchRules(false);
            ruleSelect.value = String(ruleId);
            syncFormToRule();
            AtomicUI.showToast("Rule updated", `${name} has been updated.`);
        } catch (error) {
            AtomicUI.showToast("Update failed", error.message, "error");
        } finally {
            AtomicUI.setButtonLoading(updateButton, false);
        }
    });

    fetchRules(false);
})();
