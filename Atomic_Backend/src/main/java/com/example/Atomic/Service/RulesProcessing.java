package com.example.Atomic.Service;

import com.example.Atomic.Model.Rules;
import com.example.Atomic.Repository.RulesRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RulesProcessing {
    @Autowired
    RulesRepo rules;
    public List<Rules> getRules() {
        return rules.findAll();
    }
    public List<Rules> getRulesByStatus(int status) {
        return rules.findAllByAlertStatusEquals(status);
    }
    public List<Rules> getRulesBySeverity(int severity) {
        return rules.findAllByAlertSeverityEquals(severity);
    }
    public String updateRulesSeverityByID(long id, int severity) {
        Rules rule = rules.findById(id).orElse(null);
        if (rule != null) {
            rule.setAlertSeverity(severity);
            rules.save(rule);
            return "Rules updated successfully!";
        }
        return "Rule not found!";
    }
    public String updateRulesNameByID(long id, String name) {
        Rules rule = rules.findById(id).orElse(null);
        if (rule != null) {
            rule.setAlertName(name);
            rules.save(rule);
            return "Rules updated successfully!";
        }
        return "Rule not found!";
    }
    public String updateRulesStatusByID(long id, int status) {
        Rules rule = rules.findById(id).orElse(null);
        if (rule != null) {
            rule.setAlertStatus(status);
            rules.save(rule);
            return "Rules updated successfully!";
        }
        return "Rule not found!";
    }

}
