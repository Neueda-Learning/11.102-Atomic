package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Model.User;
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

        // logic for processing the transaction
        // and updating the balances of the debit and credit accounts
        User debitUser = user.findByAccountNumber(transaction.getDebitAccountNumber());
        debitUser.setBalance(debitUser.getBalance()-transaction.getAmount());
        user.save(debitUser);
        User creditUser = user.findByAccountNumber(transaction.getCreditAccountNumber());
        creditUser.setBalance(creditUser.getBalance()+transaction.getAmount());
        user.save(creditUser);

        transaction.setStatus(4);
        trans.save(transaction);
        return "Transaction processed successfully!";
    }
}
