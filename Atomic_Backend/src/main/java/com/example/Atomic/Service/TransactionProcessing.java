package com.example.Atomic.Service;

import org.springframework.stereotype.Component;

@Component
public class TransactionProcessing {
    public String processTransaction() {
        // Implement transaction processing logic here
        return "Transaction processed successfully!";
    }
    public String getTransactionDetails() {
        // Implement transaction details retrieval logic here
        return "Transaction details";
    }

}
