package com.example.Atomic.Model;

public class Rules {
    // Rule Name, Type, Status (Active/Inactive), Severity
    private String rule_name;
    private String rule_type;
    private int rule_status;
    private int rule_severity;

    Rules(String rule_name, String rule_type, int rule_status, int rule_severity) {
        this.rule_name = rule_name;
        this.rule_type = rule_type;
        this.rule_status = rule_status;
        this.rule_severity = rule_severity;
    }

    public String getRule_name() {
        return rule_name;
    }

    public void setRule_name(String rule_name) {
        this.rule_name = rule_name;
    }

    public String getRule_type() {
        return rule_type;
    }

    public void setRule_type(String rule_type) {
        this.rule_type = rule_type;
    }

    public int getRule_status() {
        return rule_status;
    }

    public void setRule_status(int rule_status) {
        this.rule_status = rule_status;
    }

    public int getRule_severity() {
        return rule_severity;
    }

    public void setRule_severity(int rule_severity) {
        this.rule_severity = rule_severity;
    }
}
