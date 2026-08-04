package com.example.Atomic.Model;

import jakarta.persistence.*;
import org.springframework.stereotype.Component;

@Component
@Entity
public class Rules {
    // Rule ID, Rule Name, Status (Active/Inactive), Severity
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_id")
    private long alertID;
    @Column(name = "alert_name")
    private String alertName;
    //@Column(name = "rule_type")
    //private String ruleType;
    @Column(name = "alert_status")
    private int alertStatus;
    @Column(name = "alert_severity")
    private int alertSeverity;

    public Rules() {}

    public Rules(long alertID, String alertName, int alertStatus, int alertSeverity) {
        this.alertID = alertID;
        this.alertName = alertName;
        //this.ruleType = ruleType;
        this.alertStatus = alertStatus;
        this.alertSeverity = alertSeverity;
    }

    public long getAlertID() {
        return alertID;
    }

    public void setAlertID(long alertID) {
        this.alertID = alertID;
    }

    public String getAlertName() {
        return alertName;
    }

    public void setAlertName(String alertName) {
        this.alertName = alertName;
    }

//    public String getRuleType() {
//        return ruleType;
//    }

//    public void setRuleType(String rule_type) {
//        this.ruleType = rule_type;
//    }

    public int getAlertStatus() {
        return alertStatus;
    }

    public void setAlertStatus(int alertStatus) {
        this.alertStatus = alertStatus;
    }

    public int getAlertSeverity() {
        return alertSeverity;
    }

    public void setAlertSeverity(int alertSeverity) {
        this.alertSeverity = alertSeverity;
    }
}
