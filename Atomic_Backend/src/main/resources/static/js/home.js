(function () {
    "use strict";

    const signedIn = Boolean(AtomicApi.getUser());

    document.querySelectorAll("[data-guest-nav]").forEach((element) => {
        element.hidden = signedIn;
    });
    document.querySelectorAll("[data-auth-nav]").forEach((element) => {
        element.hidden = !signedIn;
    });

    AtomicApi.bindLogout();
})();
