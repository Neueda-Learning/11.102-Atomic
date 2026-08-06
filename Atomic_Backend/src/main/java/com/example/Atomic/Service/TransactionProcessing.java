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
    @Autowired
    AlertProcessing alertProcessing;

    public String processTransaction(Transactions transaction) {

        // Resolve both accounts before touching any balance
        User debitUser = user.findByAccountNumber(transaction.getDebitAccountNumber());
        if (debitUser == null) {
            transaction.setStatus(5);
            trans.save(transaction);
            return "Debit account " + transaction.getDebitAccountNumber() + " does not exist.";
        }

        User creditUser = user.findByAccountNumber(transaction.getCreditAccountNumber());
        if (creditUser == null) {
            transaction.setStatus(5);
            trans.save(transaction);
            return "Credit account " + transaction.getCreditAccountNumber() + " does not exist.";
        }

        // Deduct from debit, add to credit
        debitUser.setBalance(debitUser.getBalance() - transaction.getAmount());
        user.save(debitUser);

        creditUser.setBalance(creditUser.getBalance() + transaction.getAmount());
        user.save(creditUser);

        transaction.setStatus(4);
        trans.save(transaction);
        alertProcessing.generateAlert(transaction.getDebitAccountNumber(), 0);
        return "Transaction processed successfully!";
    }
}
