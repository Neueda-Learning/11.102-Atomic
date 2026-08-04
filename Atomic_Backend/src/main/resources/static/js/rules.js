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
    let rules = [];

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

    function renderRules() {
        const selectedStatus = filter.value;
        const visibleRules = selectedStatus === "all"
            ? rules
            : rules.filter((rule) => String(rule.status) === selectedStatus);

        summary.innerHTML = `<strong>${visibleRules.length}</strong> of ${rules.length} rules shown`;

        if (!visibleRules.length) {
            table.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">0</span>
                        <h3>No rules in this state</h3>
                        <p>Select another filter or add seed data to the database.</p>
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

    async function fetchRules(showNotification = true) {
        const button = document.querySelector("#fetch-rules");
        const selectedRuleId = Number(ruleSelect.value);

        try {
            AtomicUI.setButtonLoading(button, true, "Fetching…");
            summary.textContent = "Loading persisted rules…";
            const payload = await AtomicUI.request("/home/rules");
            rules = (Array.isArray(payload) ? payload : []).map(normaliseRule);
            populateRuleSelect(selectedRuleId);
            renderRules();
            if (showNotification) {
                AtomicUI.showToast("Rules fetched", `${rules.length} persisted rules loaded.`);
            }
        } catch (error) {
            setUpdateEnabled(false);
            summary.textContent = "Rules could not be fetched.";
            table.innerHTML = `
                <div class="empty-state">
                    <div>
                        <span class="empty-state__mark">!</span>
                        <h3>Backend unavailable</h3>
                        <p>${AtomicUI.escapeHtml(error.message)}</p>
                    </div>
                </div>
            `;
            if (showNotification) {
                AtomicUI.showToast("Fetch failed", error.message, "error");
            }
        } finally {
            AtomicUI.setButtonLoading(button, false);
        }
    }

    document.querySelector("#fetch-rules").addEventListener("click", () => fetchRules(true));
    filter.addEventListener("change", renderRules);
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
            AtomicUI.showToast("Rule updated", `${name} was saved to the database.`);
        } catch (error) {
            AtomicUI.showToast("Update failed", error.message, "error");
        } finally {
            AtomicUI.setButtonLoading(updateButton, false);
        }
    });

    fetchRules(false);
})();
