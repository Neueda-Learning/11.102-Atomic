(function () {
    "use strict";

    const statusLabels = {
        1: "Created",
        2: "Validated",
        3: "Sent",
        4: "Completed",
        5: "Failed"
    };

    function setActiveNavigation() {
        const page = document.body.dataset.page;
        document.querySelectorAll("[data-nav]").forEach((link) => {
            if (link.dataset.nav === page) {
                link.setAttribute("aria-current", "page");
            }
        });
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function formatCurrency(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
            return "—";
        }

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(numericValue);
    }

    function formatAccount(value) {
        const account = String(value ?? "");
        if (account.length <= 4) {
            return account || "—";
        }

        return `${"•".repeat(Math.min(6, account.length - 4))}${account.slice(-4)}`;
    }

    function statusBadge(status) {
        const numericStatus = Number(status);
        const labels = {
            1: ["Created", "info"],
            2: ["Validated", "info"],
            3: ["Sent", "warning"],
            4: ["Completed", "success"],
            5: ["Failed", "danger"]
        };
        const [label, style] = labels[numericStatus] ?? [`Status ${status}`, "info"];
        return `<span class="badge badge--${style}">${escapeHtml(label)}</span>`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function parseResponseText(text) {
        const trimmed = text.trim();
        const looksLikeJson = trimmed.startsWith("{")
            || trimmed.startsWith("[");

        if (!looksLikeJson || !trimmed) {
            return text;
        }

        const precisionSafeText = trimmed.replace(
            /("(?:accountNumber|debitAccountNumber|creditAccountNumber)"\s*:\s*)(-?\d+)/g,
            "$1\"$2\""
        );

        return JSON.parse(precisionSafeText);
    }

    async function request(path, options = {}) {
        const response = await fetch(path, {
            ...options,
            headers: {
                Accept: "application/json, text/plain, */*",
                ...options.headers
            }
        });

        const text = await response.text();
        const body = parseResponseText(text);

        if (!response.ok) {
            const message = typeof body === "string"
                ? body
                : body?.message ?? `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        return body;
    }

    function showToast(title, message, type = "success") {
        let region = document.querySelector(".toast-region");
        if (!region) {
            region = document.createElement("div");
            region.className = "toast-region";
            region.setAttribute("aria-live", "polite");
            document.body.appendChild(region);
        }

        const toast = document.createElement("div");
        toast.className = `toast${type === "error" ? " toast--error" : ""}`;
        toast.innerHTML = `
            <div>
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(message)}</span>
            </div>
            <button type="button" aria-label="Dismiss notification">×</button>
        `;
        toast.querySelector("button").addEventListener("click", () => toast.remove());
        region.appendChild(toast);

        window.setTimeout(() => toast.remove(), 5200);
    }

    function setButtonLoading(button, loading, loadingLabel = "Working…") {
        if (loading) {
            button.dataset.originalLabel = button.textContent;
            button.textContent = loadingLabel;
            button.disabled = true;
            return;
        }

        button.textContent = button.dataset.originalLabel ?? button.textContent;
        button.disabled = false;
    }

    window.AtomicUI = {
        escapeHtml,
        formatAccount,
        formatCurrency,
        formatDate,
        request,
        setButtonLoading,
        showToast,
        statusBadge,
        statusLabels
    };

    document.addEventListener("DOMContentLoaded", setActiveNavigation);
})();
