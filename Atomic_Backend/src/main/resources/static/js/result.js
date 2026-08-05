(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    const pendingRequest = AtomicApi.getPendingRequest();
    let transaction = AtomicApi.getTransaction();
    const resultType = document.body.dataset.result;

    if (!user) {
        return;
    }
    if (!pendingRequest || !transaction) {
        location.replace("/transaction.html");
        return;
    }

    function render() {
        const info = AtomicApi.statusInfo(transaction.status);
        document.querySelector("#result-id").textContent = `#${AtomicApi.transactionId(transaction)}`;
        document.querySelector("#result-amount").textContent = AtomicApi.formatMoney(transaction.amount);
        document.querySelector("#result-debit").textContent = AtomicApi.maskAccount(transaction.debitAccountNumber);
        document.querySelector("#result-credit").textContent = AtomicApi.maskAccount(transaction.creditAccountNumber);
        document.querySelector("#result-status").textContent = info.label;

        const balanceElement = document.querySelector("#result-balance");
        if (balanceElement) {
            balanceElement.textContent = AtomicApi.formatMoney(
                Math.max(0, user.balance - Number(transaction.amount))
            );
            balanceElement.title = "Projection based on the balance returned at login";
        }
    }

    async function verifyTerminalStatus() {
        try {
            const transactions = await AtomicApi.fetchTransactionsForDebit(user.accountNumber);
            const verified = AtomicApi.findSubmittedTransaction(
                transactions,
                pendingRequest,
                AtomicApi.transactionId(transaction)
            );

            if (verified) {
                transaction = verified;
                AtomicApi.setTransaction(verified);
            }

            const status = Number(transaction.status);
            if (resultType === "success" && status !== 4) {
                location.replace(status === 5
                    ? "/failed.html"
                    : "/processing.html");
                return;
            }
            if (resultType === "failed" && status !== 5) {
                location.replace(status === 4
                    ? "/success.html"
                    : "/processing.html");
                return;
            }

            render();
        } catch (error) {
            // The stored transaction was itself previously fetched from the backend.
            // Keep the receipt visible when a subsequent verification request fails.
            render();
        }
    }

    verifyTerminalStatus();
})();
