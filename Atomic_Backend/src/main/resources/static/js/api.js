(function () {
    "use strict";

    const USER_KEY = "atomic.v2.user";
    const REQUEST_KEY = "atomic.v2.pending-request";
    const TRANSACTION_KEY = "atomic.v2.transaction";
    const THEME_KEY = "atomic.v2.theme";

    function getStoredTheme() {
        try {
            const stored = localStorage.getItem(THEME_KEY);
            return stored === "dark" || stored === "light" ? stored : null;
        } catch (error) {
            return null;
        }
    }

    function resolveTheme() {
        const stored = getStoredTheme();
        if (stored) {
            return stored;
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function updateThemeToggleLabels(theme) {
        const isDark = theme === "dark";
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.setAttribute("aria-pressed", String(isDark));
            button.textContent = isDark ? "Theme: Dark" : "Theme: Light";
            button.setAttribute("aria-label", isDark
                ? "Switch to light theme"
                : "Switch to dark theme");
        });
    }

    function applyTheme(theme, persist = true) {
        const safeTheme = theme === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", safeTheme);
        if (persist) {
            try {
                localStorage.setItem(THEME_KEY, safeTheme);
            } catch (error) {
                // Ignore storage limits and privacy mode restrictions.
            }
        }
        updateThemeToggleLabels(safeTheme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme") || "light";
        applyTheme(current === "dark" ? "light" : "dark");
    }

    function mountThemeToggle() {
        if (document.querySelector("[data-theme-toggle]")) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.themeToggle = "true";
        button.className = "theme-toggle";
        button.addEventListener("click", toggleTheme);

        const nav = document.querySelector(".nav");
        if (nav) {
            if (nav.querySelector(".nav-action")) {
                button.classList.add("nav-action");
            } else if (nav.querySelector(".link-button")) {
                button.classList.add("link-button");
            }
            nav.appendChild(button);
            return;
        }

        button.classList.add("theme-toggle--floating");
        document.body.appendChild(button);
    }

    function initTheme() {
        applyTheme(resolveTheme(), false);
        mountThemeToggle();
        updateThemeToggleLabels(document.documentElement.getAttribute("data-theme") || "light");
    }

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
        const firstName = user.firstName || fullName.split(" ")[0] || "User";
        const initials = `${String(user.firstName || "").slice(0, 1)}${String(user.lastName || "").slice(0, 1)}`
            .replace(/[^a-z0-9]/gi, "")
            .toUpperCase() || "AU";
        document.querySelectorAll("[data-user-name]").forEach((element) => {
            element.textContent = fullName;
        });
        document.querySelectorAll("[data-user-first-name]").forEach((element) => {
            element.textContent = firstName;
        });
        document.querySelectorAll("[data-user-initials]").forEach((element) => {
            element.textContent = initials;
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
        applyTheme,
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
        initTheme,
        setTransaction,
        setUser,
        statusInfo,
        toggleTheme,
        transactionId
    };

    initTheme();
})();
