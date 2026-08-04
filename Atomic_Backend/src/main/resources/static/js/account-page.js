(function () {
    "use strict";

    const user = AtomicApi.requireUser();
    if (!user) {
        return;
    }

    AtomicApi.populateUser(user);
    AtomicApi.bindLogout();
})();
