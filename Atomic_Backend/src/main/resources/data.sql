
-- Mock Data for Rules Table
INSERT IGNORE INTO rules (alert_name, alert_status, alert_severity) VALUES
('Amount Threshold Check', 1, 3),
('Account Velocity Check', 1, 2),
('New Payee Check', 1, 3),
('Daily Limit Threshold Check', 1, 1),
('Suspicious Account Activity', 1, 4),
('Multiple Failed Transactions', 2, 2);
