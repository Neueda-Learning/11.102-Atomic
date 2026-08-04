package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TransactionProcessing {
    @Autowired
    TransactionsRepo trans;
    public String processTransaction(Transactions transaction) {
        //balance = balance - transaction.getAmount();
        //transaction.setStatus(3);
        //trans.save(transaction);
        transaction.setStatus(4);
        trans.save(transaction);
        return "Transaction processed successfully!";
    }
}
