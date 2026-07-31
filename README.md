# 11.102-Atomic
This is the Repo for the Atomic/Group-4 Team 

DBMS Tables --> Transaction Details, Alerts, Rules;

Field in Transaction --> Transaction ID, Account, Payee, Amount, Timestamp, Status

Fields in Alerts --> Alert ID, Severity, Open Status, Acknowledge Status, Alert Date, Alert Time, Alert Resolution Time

Fields in Rules --> Rule Name, Type, Status (Active/Inactive), Severity

HTTP Methods mapping with Methods in Controller -->

GET --> fetch alert details from the db, transaction details from the db, rules details from the db,
POST --> receive alert status from the user, receive rules details from the user,
PUT --> For changing the alert status dynamically, changing rules dynamically,
