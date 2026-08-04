
CREATE TABLE IF NOT EXISTS transactions (
    trans_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    debit_account_number BIGINT NOT NULL,
    credit_account_number BIGINT NOT NULL,
    amount DOUBLE NOT NULL,
    time_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status INT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
    alert_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_name VARCHAR(255) NOT NULL,
    alert_status INT NOT NULL,
    alert_severity INT NOT NULL
);

CREATE TABLE IF NOT EXISTS alert (
    alert_gen_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT NOT NULL,
    status INT NOT NULL,
    alert_time TIMESTAMP NOT NULL,
    resolution_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user (
    account_number BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_balance DOUBLE NOT NULL,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    email_id VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    time_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);