package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import com.example.Atomic.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TransactionProcessing {
    @Autowired
    TransactionsRepo trans;
    @Autowired
    UserRepo user;
    public String processTransaction(Transactions transaction) {

        //balance = balance - transaction.getAmount();
        //transaction.setStatus(3);
        //trans.save(transaction);

//        user.findBalanceByAccountNumber(transaction.getDebitAccountNumber());
//        user.updateBalanceByAccountNumber(transaction.getDebitAccountNumber(), transaction.getAmount());
//        user.findBalanceByAccountNumber(transaction.getCreditAccountNumber());
//        user.updateBalanceByAccountNumber(transaction.getCreditAccountNumber(), transaction.getAmount());

        transaction.setStatus(4);
        trans.save(transaction);
        return "Transaction processed successfully!";
    }
}
