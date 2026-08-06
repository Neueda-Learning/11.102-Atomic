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
    @Autowired
    AlertRepo alert;
    @Autowired
    RulesRepo rules;
    @Autowired
    TransactionsRepo trans;

    public String getAlert() {

        return "Alert message";
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
                if(transaction.getAmount() > rule1.getAlertSeverity()) {
                    checkAlert = true;
                    transStore1.add(transaction);
                }
            }


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule1.getAlertSeverity();
                Alert newAlert = new Alert(rule1.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
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
            if(count > rule2.getAlertSeverity()) {
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
                Alert newAlert = new Alert(rule2.getAlertID(), 1, Instant.now(), null);
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

            if(suspiciousTransaction > rule3.getAlertSeverity()) {
                checkAlert = true;
            }

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule3.getAlertSeverity();
                Alert newAlert = new Alert(rule3.getAlertID(), 1, Instant.now(), null);
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

            if (totalTodayAmount > rule4.getAlertSeverity()) {
                checkAlert = true;
            }


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule4.getAlertSeverity();
                Alert newAlert = new Alert(rule4.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule5 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not
            // transaction to blacklisted account logic
            long[] blacklistedAccounts = {9999999999L, 8888888888L, 7777777777L};
            for (Transactions transaction : transactions) {
                long creditAccount = transaction.getCreditAccountNumber();
                for (long blockedAccount : blacklistedAccounts) {
                    if (creditAccount == blockedAccount) {
                        checkAlert = true;
                        transStore5.add(transaction);
                        break;
                    }
                }
            }

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule5.getAlertSeverity();
                Alert newAlert = new Alert(rule5.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule6 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not
            // transaction from blacklisted account logic
            long[] blacklistedAccounts = {9999999999L, 8888888888L, 7777777777L};
            for (Transactions transaction : transactions) {
                long debitAccount = transaction.getDebitAccountNumber();
                for (long blockedAccount : blacklistedAccounts) {
                    if (debitAccount == blockedAccount) {
                        checkAlert = true;
                        transStore6.add(transaction);
                        break;
                    }
                }
            }

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule6.getAlertSeverity();
                Alert newAlert = new Alert(rule6.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        return generatedAlerts;
    }
}
