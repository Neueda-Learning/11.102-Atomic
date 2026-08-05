(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    if (!user) {
        return;
    }

    AtomicApi.populateUser(user);
    AtomicApi.bindLogout();

    const recentContainer = document.querySelector("#recent-transfers");
    const recentSummary = document.querySelector("#recent-summary");

    function renderRecentTransfers(items) {
        if (!recentContainer || !recentSummary) {
            return;
        }

        if (!items.length) {
            recentSummary.textContent = "No transfers found yet.";
            recentContainer.innerHTML = '<p class="form-message">Your newest transfers will appear here after submission.</p>';
            return;
        }

        recentSummary.textContent = `Showing ${items.length} recent transfer${items.length === 1 ? "" : "s"}.`;
        const rows = items.map((item) => {
            const status = AtomicApi.statusInfo(item.status);
            const id = AtomicApi.transactionId(item);
            return `
                <li>
                    <span class="recent-transfer__main">#${id} · ${AtomicApi.maskAccount(item.creditAccountNumber)}</span>
                    <span class="recent-transfer__meta">${AtomicApi.formatMoney(item.amount)}</span>
                    <span class="badge badge--${status.className}">${status.label}</span>
                </li>
            `;
        }).join("");

        recentContainer.innerHTML = `<ul class="recent-transfers-list">${rows}</ul>`;
    }

    async function loadRecentTransfers() {
        if (!recentContainer || !recentSummary) {
            return;
        }

        try {
            const all = await AtomicApi.fetchTransactionsForDebit(user.accountNumber);
            const recent = all
                .slice()
                .sort((left, right) => Number(AtomicApi.transactionId(right)) - Number(AtomicApi.transactionId(left)))
                .slice(0, 5);
            renderRecentTransfers(recent);
        } catch (error) {
            recentSummary.textContent = "Could not load recent transfers.";
            recentContainer.innerHTML = '<p class="form-message form-message--error">Please retry after refreshing the page.</p>';
        }
    }

    void loadRecentTransfers();
})();
