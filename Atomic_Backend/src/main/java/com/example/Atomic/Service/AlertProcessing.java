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
        rule2 = activeRules.stream().filter(obj -> "Frequent Transaction Detection".equals(obj.getAlertName())).findFirst().orElse(null);
        rule3 = activeRules.stream().filter(obj -> "Suspicious Transaction Detection".equals(obj.getAlertName())).findFirst().orElse(null);
        rule4 = activeRules.stream().filter(obj -> "Transaction Amount Exceeds Limit".equals(obj.getAlertName())).findFirst().orElse(null);
        rule5 = activeRules.stream().filter(obj -> "Transaction to Blacklisted Account".equals(obj.getAlertName())).findFirst().orElse(null);
        rule6 = activeRules.stream().filter(obj -> "Transaction from Blacklisted Account".equals(obj.getAlertName())).findFirst().orElse(null);

        if(rule1 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule1.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, transStore1, rule1.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);List.of(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule2 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule2.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, transStore2, rule2.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule3 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule3.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, transStore3, rule3.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule4 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not


            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule4.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, transStore4, rule4.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule5 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule5.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, transStore5, rule5.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        if(rule6 != null)
        {
            boolean checkAlert = false;
            // logic to check if the alert should be generated or not

            // Generate alert
            if(checkAlert == true) {
                totalSeverity += rule6.getAlertSeverity();
                Alert newAlert = new Alert(accountNumber, transStore6, rule6.getAlertID(), 1, Instant.now(), null);
                alert.save(newAlert);
                generatedAlerts.add(newAlert);
            }
        }
        return generatedAlerts;
    }
}
