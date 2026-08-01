package com.example.Atomic.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SuperController {

    // post transaction
    @PostMapping("/home/transaction/process")
    public String ProcessTransaction() {
        // Implement transaction processing logic here
        return "Transaction processed successfully!";
    }

    // fetch transaction details
    @GetMapping("/home/transaction")
    public String GetTransactionDetails() {
        // Implement transaction details retrieval logic here
        return "Transaction details";
    }

    // fetch alert status
    @GetMapping("/home/alert")
    public String GetAlert() {
        // Implement alert retrieval logic here
        return "Alert message";
    }

    // fetch rules
    @PutMapping("/home/rules")
    public String GetRules() {
        // Implement rules update logic here
        return "Rules details";
    }

    // update alert status
    @PostMapping("/home/alert/update")
    public String UpdateAlertStatus() {
        // Implement alert status update logic here
        return "Alert status updated successfully!";
    }

    // update rules
    @PostMapping("/home/rules/update")
    public String UpdateRulesStatus() {
        // Implement rules status update logic here
        return "Rules status updated successfully!";
    }

}
