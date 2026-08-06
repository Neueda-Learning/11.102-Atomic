package com.example.Atomic.Service;

import com.example.Atomic.Model.Alert;
import com.example.Atomic.Model.Rules;
import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.AlertRepo;
import com.example.Atomic.Repository.RulesRepo;
import com.example.Atomic.Repository.TransactionsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class AlertProcessing {

    // Hardcoded thresholds for each rule (no threshold field exists in Rules model)
    private static final double RULE1_HIGH_VALUE_THRESHOLD = 10000.0;   // alert if single transaction > $10,000
    private static final int    RULE2_VELOCITY_THRESHOLD   = 5;         // alert if more than 5 transactions in last 5 minutes
    private static final int    RULE3_NIGHT_TX_THRESHOLD   = 3;         // alert if more than 3 night-time transactions (12AM-6AM)
    private static final double RULE4_DAILY_LIMIT          = 50000.0;   // alert if daily total exceeds $50,000
    private static final int    RULE6_FAILED_TX_LIMIT      = 3;         // alert if more than 3 failed transactions today

    @Autowired
    AlertRepo alert;
    @Autowired
    RulesRepo rules;
    @Autowired
    TransactionsRepo trans;

    public String getAlert() {

        return "Alert message";
    }

     // generateAlert method but only for rule 6
    public List<Alert> generateAlert6(long accountNumber, int totalSeverity) {
        List<Transactions> transactions = trans.findAllByDebitAccountNumberEquals(accountNumber);
        List<Rules> activeRules = rules.findAllByAlertStatusEquals(1);
        List<Alert> generatedAlerts = new ArrayList<>();

        Rules rule6 = activeRules.stream()
                .filter(obj -> "Multiple Failed Transactions ".equals(obj.getAlertName()))
                .findFirst()
                .orElse(null);

        if (rule6 != null) {
            boolean checkAlert = false;

            // very simple logic: count today's failed transactions and compare with rule limit
            java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.systemDefault());
            int failedTransactionCount = 0;

            for (Transactions transaction : transactions) {
                if (transaction.getTimeDate() != null) {
                    java.time.LocalDate txDate = transaction.getTimeDate()
                            .atZone(java.time.ZoneId.systemDefault())
                            .toLocalDate();

                    // status 5 means failed (as per Transactions model comment)
                    if (today.equals(txDate) && transaction.getStatus() == 5) {
                        failedTransactionCount = failedTransactionCount + 1;
                    }
                }
            }

            if (failedTransactionCount > RULE6_FAILED_TX_LIMIT) {
                checkAlert = true;
            }

            // Generate alert
            if (checkAlert == true) {
                totalSeverity += rule6.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, rule6.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }

        return generatedAlerts;
    }


    public List<Alert> generateAlert(long accountNumber, int totalSeverity) {
        // On submission of any transaction this method will be called
        // to check the rules and generate an alert if any rule is violated.
        List<Transactions> transactions = trans.findAllByDebitAccountNumberEquals(accountNumber);
        List<Rules> activeRules = rules.findAllByAlertStatusEquals(1);
        List<Alert> generatedAlerts = new ArrayList<>();

        Rules rule1;
        Rules rule2;
        Rules rule3;
        Rules rule4;
        Rules rule5;
        Rules rule6;

        List<Transactions> transStore1 = new ArrayList<>();
        List<Transactions> transStore2 = new ArrayList<>();
        List<Transactions> transStore3 = new ArrayList<>();
        List<Transactions> transStore4 = new ArrayList<>();
        List<Transactions> transStore5 = new ArrayList<>();
        List<Transactions> transStore6 = new ArrayList<>();

        rule1 = activeRules.stream().filter(obj -> "High Value Transaction Detection".equals(obj.getAlertName())).findFirst().orElse(null);
        rule2 = activeRules.stream().filter(obj -> "Frequent Transaction Exceeds Limit".equals(obj.getAlertName())).findFirst().orElse(null);
        rule3 = activeRules.stream().filter(obj -> "Suspicious Transaction Detection".equals(obj.getAlertName())).findFirst().orElse(null);
        rule4 = activeRules.stream().filter(obj -> "Transaction Amount Exceeds Limit".equals(obj.getAlertName())).findFirst().orElse(null);
        rule5 = activeRules.stream().filter(obj -> "New Payee detection".equals(obj.getAlertName())).findFirst().orElse(null);
        rule6 = activeRules.stream().filter(obj -> "Multiple Failed Transactions ".equals(obj.getAlertName())).findFirst().orElse(null);

        if(rule1 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not
            //high value transaction detection logic
            for(Transactions transaction : transactions) {
                if(transaction.getAmount() > RULE1_HIGH_VALUE_THRESHOLD) {
                    checkAlert = true;
                    transStore1.add(transaction);
                }
            }


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule1.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, rule1.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);List.of(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule2 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not
            //frequent transaction exceeds limit logic for last 5 minutes implementation
            Instant fiveMinutesAgo = Instant.now().minusSeconds(300);
            long count = transactions.stream()
                    .filter(transaction -> transaction.getTimeDate() != null)
                    .filter(transaction -> transaction.getTimeDate().isAfter(fiveMinutesAgo))
                    .count();
            if(count > RULE2_VELOCITY_THRESHOLD) {
                checkAlert = true;
                for (Transactions transaction : transactions) {
                    if (transaction.getTimeDate() != null && transaction.getTimeDate().isAfter(fiveMinutesAgo)) {
                        transStore2.add(transaction);
                    }
                }
            }

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule2.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, rule2.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule3 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not
            // suspicious transaction detection logic:
            // check for unusually high number of night transactions (12 AM to 6 AM)
            long suspiciousTransaction = 0;
            for (Transactions transaction : transactions) {
                if (transaction.getTimeDate() == null) {
                    continue;
                }
                int hour = transaction.getTimeDate().atZone(java.time.ZoneId.systemDefault()).getHour();
                if (hour >= 0 && hour <= 6) {
                    suspiciousTransaction++;
                    transStore3.add(transaction);
                }
            }

            if(suspiciousTransaction > RULE3_NIGHT_TX_THRESHOLD) {
                checkAlert = true;
            }

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule3.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, rule3.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule4 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not
            // daily limit logic:
            // sum all today's transactions and compare with threshold
            java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.systemDefault());
            double totalTodayAmount = 0;
            for (Transactions transaction : transactions) {
                if (transaction.getTimeDate() == null) {
                    continue;
                }
                java.time.LocalDate txDate = transaction.getTimeDate()
                        .atZone(java.time.ZoneId.systemDefault())
                        .toLocalDate();
                if (today.equals(txDate)) {
                    totalTodayAmount += transaction.getAmount();
                    transStore4.add(transaction);
                }
            }

            if (totalTodayAmount > RULE4_DAILY_LIMIT) {
                checkAlert = true;
            }


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule4.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, rule4.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule5 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not
            // new payee detection logic:
            // Step 1: Find the most recent transaction (the one just submitted)
            Transactions latestTransaction = null;
            for (Transactions transaction : transactions) {
                if (latestTransaction == null) {
                    latestTransaction = transaction;
                } else {
                    if (transaction.getTimeDate() != null && latestTransaction.getTimeDate() != null) {
                        if (transaction.getTimeDate().isAfter(latestTransaction.getTimeDate())) {
                            latestTransaction = transaction;
                        }
                    }
                }
            }

            // Step 2: If we found a latest transaction, check if its credit account number
            // has ever appeared in any previous transaction
            if (latestTransaction != null) {
                long newPayeeAccountNumber = latestTransaction.getCreditAccountNumber();
                boolean seenBefore = false;

                // Step 3: Loop through all transactions and check if this credit account was used before
                for (Transactions transaction : transactions) {
                    // Skip the latest transaction itself - we only want to compare against older ones
                    if (transaction.getTransID() == latestTransaction.getTransID()) {
                        continue;
                    }
                    // Check if this older transaction was sent to the same credit account
                    if (transaction.getCreditAccountNumber() == newPayeeAccountNumber) {
                        seenBefore = true;
                        break;
                    }
                }

                // Step 4: If not seen before, it means this is a brand new payee - trigger the alert
                if (seenBefore == false) {
                    checkAlert = true;
                    transStore5.add(latestTransaction);
                }
            }

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule5.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, rule5.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule6 != null)
        {
            List<Alert> rule6Alerts = generateAlert6(accountNumber, totalSeverity);
            generatedAlerts.addAll(rule6Alerts);
        }
        return generatedAlerts;
    }
}
