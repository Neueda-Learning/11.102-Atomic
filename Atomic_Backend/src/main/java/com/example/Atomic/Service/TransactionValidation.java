package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TransactionValidation {
    @Autowired
    TransactionsRepo trans;
    @Autowired
    TransactionProcessing transProcessing;
    public String validateTransaction(Transactions transaction) {
        // 0 < amount <= wallet balance, credit and debit account numbers should be 16 digits each
        // and they must not be equal
        if(transaction.getAmount() <= 0) {
            transaction.setStatus(5);
            trans.save(transaction);
            return "Transaction amount must be greater than 0.";
        }
//        if(transaction.getAmount() > balance) {
//            return "Transaction amount must be less than or equal to balance.";
//        }
        if(String.valueOf(transaction.getCreditAccountNumber()).length() != 1 ||
                String.valueOf(transaction.getDebitAccountNumber()).length() != 1) {
            transaction.setStatus(5);
            trans.save(transaction);
            return "Credit and debit account numbers must be 16 digits each.";
        }
        if(transaction.getCreditAccountNumber() == transaction.getDebitAccountNumber()) {
            transaction.setStatus(5);
            trans.save(transaction);
            return "Credit and debit account numbers must not be equal.";
        }
        transaction.setStatus(2);
        trans.save(transaction);
        transProcessing.processTransaction(transaction);
        return "Transaction is valid.";
    }
}
