(function () {
    "use strict";

    const USER_KEY = "atomic.v2.user";
    const REQUEST_KEY = "atomic.v2.pending-request";
    const TRANSACTION_KEY = "atomic.v2.transaction";

    function parseApiText(text) {
        const trimmed = text.trim();
        const looksLikeJson = trimmed.startsWith("{")
            || trimmed.startsWith("[");

        if (!looksLikeJson || !trimmed) {
            return text;
        }

        // The existing backend serializes account numbers as JSON numbers. Quoting
        // these fields before JSON.parse prevents precision loss for 16-digit longs.
        const precisionSafeText = trimmed.replace(
            /("(?:accountNumber|debitAccountNumber|creditAccountNumber)"\s*:\s*)(-?\d+)/g,
            "$1\"$2\""
        );

        return JSON.parse(precisionSafeText);
    }

    async function request(path, options = {}) {
        const response = await fetch(path, {
            credentials: "same-origin",
            ...options,
            headers: {
                Accept: "application/json, text/plain, */*",
                ...options.headers
            }
        });

        const text = await response.text();
        const body = parseApiText(text);

        if (!response.ok) {
            const message = typeof body === "string"
                ? body || `Request failed with status ${response.status}`
                : body?.message ?? `Request failed with status ${response.status}`;
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return body;
    }

    function normaliseUser(user) {
        return {
            accountNumber: String(user.accountNumber ?? ""),
            balance: Number(user.balance ?? 0),
            firstName: String(user.firstName ?? ""),
            lastName: String(user.lastName ?? ""),
            email: String(user.email ?? "")
        };
    }

    function setUser(user) {
        const normalised = normaliseUser(user);
        sessionStorage.setItem(USER_KEY, JSON.stringify(normalised));
        return normalised;
    }

    function getUser() {
        const raw = sessionStorage.getItem(USER_KEY);
        if (!raw) {
            return null;
        }

        try {
            return normaliseUser(JSON.parse(raw));
        } catch (error) {
            sessionStorage.removeItem(USER_KEY);
            return null;
        }
    }

    function requireUser() {
        const user = getUser();
        if (!user) {
            const returnTo = `${location.pathname}${location.search}`;
            location.replace(`/login.html?returnTo=${encodeURIComponent(returnTo)}`);
            return null;
        }
        return user;
    }

    function setPendingRequest(requestData) {
        sessionStorage.setItem(REQUEST_KEY, JSON.stringify(requestData));
    }

    function getPendingRequest() {
        const raw = sessionStorage.getItem(REQUEST_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function setTransaction(transaction) {
        sessionStorage.setItem(TRANSACTION_KEY, JSON.stringify(transaction));
    }

    function getTransaction() {
        const raw = sessionStorage.getItem(TRANSACTION_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function clearTransactionState() {
        sessionStorage.removeItem(REQUEST_KEY);
        sessionStorage.removeItem(TRANSACTION_KEY);
    }

    async function logout() {
        try {
            await request("/home/logout", { method: "POST" });
        } finally {
            sessionStorage.removeItem(USER_KEY);
            clearTransactionState();
            location.replace("/");
        }
    }

    function bindLogout() {
        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.addEventListener("click", logout);
        });
    }

    function populateUser(user) {
        const fullName = `${user.firstName} ${user.lastName}`.trim() || "Atomic user";
        document.querySelectorAll("[data-user-name]").forEach((element) => {
            element.textContent = fullName;
        });
        document.querySelectorAll("[data-account-number]").forEach((element) => {
            element.textContent = user.accountNumber;
        });
        document.querySelectorAll("[data-account-mask]").forEach((element) => {
            element.textContent = maskAccount(user.accountNumber);
        });
        document.querySelectorAll("[data-user-email]").forEach((element) => {
            element.textContent = user.email;
        });
        document.querySelectorAll("[data-wallet-balance]").forEach((element) => {
            element.textContent = formatMoney(user.balance);
        });
    }

    function formatMoney(value) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(value));
    }

    function maskAccount(value) {
        const account = String(value ?? "");
        if (account.length <= 4) {
            return account || "—";
        }
        return `${"•".repeat(Math.min(8, account.length - 4))}${account.slice(-4)}`;
    }

    function statusInfo(status) {
        const statuses = {
            1: { label: "Created", className: "created" },
            2: { label: "Validated", className: "validated" },
            3: { label: "Sent", className: "sent" },
            4: { label: "Completed", className: "completed" },
            5: { label: "Failed", className: "failed" }
        };
        return statuses[Number(status)] ?? {
            label: `Status ${status}`,
            className: "created"
        };
    }

    function setButtonLoading(button, loading, label = "Working…") {
        if (loading) {
            button.dataset.previousLabel = button.textContent;
            button.textContent = label;
            button.disabled = true;
            return;
        }
        button.textContent = button.dataset.previousLabel ?? button.textContent;
        button.disabled = false;
    }

    function transactionId(transaction) {
        return transaction?.transID ?? transaction?.transId ?? transaction?.transactionId;
    }

    function findSubmittedTransaction(transactions, pendingRequest, knownId) {
        if (!Array.isArray(transactions)) {
            return null;
        }

        if (knownId != null) {
            const known = transactions.find((item) =>
                String(transactionId(item)) === String(knownId));
            if (known) {
                return known;
            }
        }

        return transactions
            .filter((item) =>
                String(item.creditAccountNumber) === String(pendingRequest.creditAccountNumber)
                && Math.abs(Number(item.amount) - Number(pendingRequest.amount)) < 0.005)
            .sort((left, right) => Number(transactionId(right)) - Number(transactionId(left)))[0] ?? null;
    }

    async function fetchTransactionsForDebit(accountNumber) {
        const params = new URLSearchParams({
            debit_account_number: String(accountNumber)
        });
        const result = await request(`/home/transaction/fetch/debit?${params}`);
        return Array.isArray(result) ? result : [];
    }

    window.AtomicApi = {
        bindLogout,
        clearTransactionState,
        fetchTransactionsForDebit,
        findSubmittedTransaction,
        formatMoney,
        getPendingRequest,
        getTransaction,
        getUser,
        logout,
        maskAccount,
        populateUser,
        request,
        requireUser,
        setButtonLoading,
        setPendingRequest,
        setTransaction,
        setUser,
        statusInfo,
        transactionId
    };
})();
