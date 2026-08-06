(function () {
    "use strict";

    const USER_KEY = "atomic.v2.user";
    const REQUEST_KEY = "atomic.v2.pending-request";
    const TRANSACTION_KEY = "atomic.v2.transaction";
    const BATCH_KEY = "atomic.v3.transaction-batch";
    const BALANCE_APPLIED_KEY = "atomic.v2.balance-applied";
    const ALERT_OVERRIDES_KEY = "atomic.v4.alert-status-overrides";
    const THEME_KEY = "atomic.v2.theme";
    const COLOUR_MODE_KEY = "atomic.v3.colour-mode";

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

    function getStoredColourMode() {
        try {
            return localStorage.getItem(COLOUR_MODE_KEY) === "accessible"
                ? "accessible"
                : "standard";
        } catch (error) {
            return "standard";
        }
    }

    function updateColourToggleLabels(mode) {
        const accessible = mode === "accessible";
        document.querySelectorAll("[data-colour-toggle]").forEach((button) => {
            button.setAttribute("aria-pressed", String(accessible));
            button.textContent = accessible
                ? "Colour: Accessible"
                : "Colour: Standard";
            button.setAttribute("aria-label", accessible
                ? "Switch off colour-blind mode"
                : "Switch on colour-blind mode");
        });
    }

    function applyColourMode(mode, persist = true) {
        const safeMode = mode === "accessible" ? "accessible" : "standard";
        document.documentElement.setAttribute("data-colour-mode", safeMode);

        if (persist) {
            try {
                localStorage.setItem(COLOUR_MODE_KEY, safeMode);
            } catch (error) {
                // Ignore storage limits and privacy mode restrictions.
            }
        }

        updateColourToggleLabels(safeMode);
        document.dispatchEvent(new CustomEvent("atomic:colour-mode-change", {
            detail: { mode: safeMode }
        }));
    }

    function toggleColourMode() {
        const current = document.documentElement.getAttribute("data-colour-mode")
            || "standard";
        applyColourMode(current === "accessible" ? "standard" : "accessible");
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

    function mountColourToggle() {
        if (document.querySelector("[data-colour-toggle]")) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.colourToggle = "true";
        button.className = "theme-toggle";
        button.addEventListener("click", toggleColourMode);

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

        button.classList.add("theme-toggle--floating", "colour-toggle--floating");
        document.body.appendChild(button);
    }

    function initTheme() {
        applyTheme(resolveTheme(), false);
        applyColourMode(getStoredColourMode(), false);
        mountThemeToggle();
        mountColourToggle();
        updateThemeToggleLabels(document.documentElement.getAttribute("data-theme") || "light");
        updateColourToggleLabels(
            document.documentElement.getAttribute("data-colour-mode") || "standard"
        );
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
            /("(?:accountNumber|account_number|debitAccountNumber|creditAccountNumber)"\s*:\s*)(-?\d+)/g,
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
                ? body || `We couldn’t complete that request (status ${response.status}).`
                : body?.message ?? `We couldn’t complete that request (status ${response.status}).`;
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

    function setPendingBatch(batch) {
        sessionStorage.setItem(BATCH_KEY, JSON.stringify(batch));
    }

    function getPendingBatch() {
        const raw = sessionStorage.getItem(BATCH_KEY);
        if (!raw) {
            return [];
        }

        try {
            const batch = JSON.parse(raw);
            return Array.isArray(batch) ? batch : [];
        } catch (error) {
            sessionStorage.removeItem(BATCH_KEY);
            return [];
        }
    }

    function clearTransactionState() {
        sessionStorage.removeItem(REQUEST_KEY);
        sessionStorage.removeItem(TRANSACTION_KEY);
        sessionStorage.removeItem(BATCH_KEY);
    }

    async function logout() {
        try {
            await request("/home/logout", { method: "POST" });
        } finally {
            sessionStorage.removeItem(USER_KEY);
            sessionStorage.removeItem(BALANCE_APPLIED_KEY);
            sessionStorage.removeItem(ALERT_OVERRIDES_KEY);
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

    function getAppliedBalanceTransactionIds() {
        const raw = sessionStorage.getItem(BALANCE_APPLIED_KEY);
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (error) {
            sessionStorage.removeItem(BALANCE_APPLIED_KEY);
            return [];
        }
    }

    function setAppliedBalanceTransactionIds(ids) {
        sessionStorage.setItem(BALANCE_APPLIED_KEY, JSON.stringify(ids.slice(-100)));
    }

    function applyCompletedDebitToUser(transaction) {
        const user = getUser();
        if (!user || Number(transaction?.status) !== 4) {
            return user;
        }

        if (String(transaction.debitAccountNumber) !== String(user.accountNumber)) {
            return user;
        }

        const id = transactionId(transaction);
        if (id == null) {
            return user;
        }

        const appliedIds = getAppliedBalanceTransactionIds();
        const idText = String(id);
        if (appliedIds.includes(idText)) {
            return user;
        }

        const amount = Number(transaction.amount);
        const safeAmount = Number.isFinite(amount) ? amount : 0;
        const nextUser = setUser({
            ...user,
            balance: Math.max(0, Number(user.balance) - safeAmount)
        });
        appliedIds.push(idText);
        setAppliedBalanceTransactionIds(appliedIds);
        return nextUser;
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

    async function fetchTransactionsForCredit(accountNumber) {
        const params = new URLSearchParams({
            credit_account_number: String(accountNumber)
        });
        const result = await request(`/home/transaction/fetch/credit?${params}`);
        return Array.isArray(result) ? result : [];
    }

    function alertStatusInfo(status) {
        const statuses = {
            1: { label: "Opened", className: "danger" },
            2: { label: "Acknowledged", className: "warning" },
            3: { label: "Closed", className: "success" }
        };
        return statuses[Number(status)] ?? {
            label: `Status ${status}`,
            className: "info"
        };
    }

    function alertKey(alert) {
        const generatedId = alert?.alertGenId;
        if (generatedId !== null && generatedId !== undefined && generatedId !== "") {
            return `id:${generatedId}`;
        }

        return [
            `account:${String(alert?.accountNumber ?? "")}`,
            `rule:${String(alert?.ruleId ?? "")}`,
            `time:${String(alert?.alertTime ?? "")}`
        ].join("|");
    }

    function readAlertOverrides() {
        try {
            const stored = JSON.parse(sessionStorage.getItem(ALERT_OVERRIDES_KEY) || "{}");
            return stored && typeof stored === "object" ? stored : {};
        } catch (error) {
            sessionStorage.removeItem(ALERT_OVERRIDES_KEY);
            return {};
        }
    }

    function writeAlertOverride(alert, status, resolutionTime = null) {
        const overrides = readAlertOverrides();
        const key = alertKey(alert);
        overrides[key] = {
            status: Number(status),
            resolutionTime: resolutionTime ?? alert.resolutionTime ?? null
        };
        sessionStorage.setItem(ALERT_OVERRIDES_KEY, JSON.stringify(overrides));

        return {
            ...alert,
            status: Number(status),
            resolutionTime: overrides[key].resolutionTime
        };
    }

    function normaliseAlert(rawAlert, requestedAccountNumber) {
        const alert = {
            alertGenId: rawAlert.alertGenID
                ?? rawAlert.alertGenId
                ?? rawAlert.alert_gen_id
                ?? rawAlert.id
                ?? null,
            accountNumber: String(rawAlert.accountNumber
                ?? rawAlert.account_number
                ?? requestedAccountNumber
                ?? ""),
            ruleId: rawAlert.alertID
                ?? rawAlert.alertId
                ?? rawAlert.alert_id
                ?? rawAlert.ruleId
                ?? null,
            status: Number(rawAlert.status ?? 1),
            alertTime: rawAlert.alertTime ?? rawAlert.alert_time ?? null,
            resolutionTime: rawAlert.resolutionTime ?? rawAlert.resolution_time ?? null
        };

        const override = readAlertOverrides()[alertKey(alert)];
        return override
            ? {
                ...alert,
                status: Number(override.status),
                resolutionTime: override.resolutionTime ?? alert.resolutionTime
            }
            : alert;
    }

    async function fetchAlerts(accountNumber) {
        const params = new URLSearchParams({ accountId: String(accountNumber) });
        const result = await request(`/home/rules/alerts?${params}`);
        return Array.isArray(result)
            ? result.map((alert) => normaliseAlert(alert, accountNumber))
            : [];
    }

    async function fetchAlertsByStatus(accountNumber, status) {
        const params = new URLSearchParams({
            accountId: String(accountNumber),
            status: String(status)
        });
        const result = await request(`/home/home/alerts/status?${params}`);
        return Array.isArray(result)
            ? result.map((alert) => normaliseAlert(alert, accountNumber))
            : [];
    }

    async function fetchAlertRules() {
        const result = await request("/home/rules");
        return Array.isArray(result) ? result : [];
    }

    function alertUpdateParams(alert) {
        const params = new URLSearchParams({
            alert_id: String(alert.ruleId ?? ""),
            status: String(alert.status ?? 1)
        });

        if (alert.alertTime) {
            params.set("alert_time", alert.alertTime);
        }
        if (alert.resolutionTime) {
            params.set("resolution_time", alert.resolutionTime);
        }
        return params;
    }

    async function acknowledgeAlert(alert) {
        const params = alertUpdateParams(alert);
        await request(`/home/home/alerts/acknowledge?${params}`);
        return writeAlertOverride(alert, 2);
    }

    async function closeAlert(alert) {
        const resolutionTime = new Date().toISOString();
        const closingAlert = writeAlertOverride(alert, 3, resolutionTime);
        const params = alertUpdateParams(closingAlert);
        await request(`/home/home/alerts/close?${params}`);
        return closingAlert;
    }

    function closeAlertKeepalive(alert) {
        const resolutionTime = new Date().toISOString();
        const closingAlert = writeAlertOverride(alert, 3, resolutionTime);
        const params = alertUpdateParams(closingAlert);

        void fetch(`/home/home/alerts/close?${params}`, {
            method: "GET",
            credentials: "same-origin",
            keepalive: true
        });

        return closingAlert;
    }

    window.AtomicApi = {
        acknowledgeAlert,
        alertKey,
        alertStatusInfo,
        applyCompletedDebitToUser,
        applyColourMode,
        applyTheme,
        bindLogout,
        clearTransactionState,
        closeAlert,
        closeAlertKeepalive,
        fetchAlertRules,
        fetchAlerts,
        fetchAlertsByStatus,
        fetchTransactionsForCredit,
        fetchTransactionsForDebit,
        findSubmittedTransaction,
        formatMoney,
        getPendingBatch,
        getPendingRequest,
        getTransaction,
        getUser,
        logout,
        maskAccount,
        populateUser,
        request,
        requireUser,
        setButtonLoading,
        setPendingBatch,
        setPendingRequest,
        initTheme,
        setTransaction,
        setUser,
        statusInfo,
        toggleColourMode,
        toggleTheme,
        transactionId
    };

    initTheme();
})();
