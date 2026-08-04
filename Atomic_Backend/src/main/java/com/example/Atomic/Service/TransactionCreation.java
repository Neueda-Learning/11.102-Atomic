package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import com.example.Atomic.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class TransactionCreation {
    @Autowired
    TransactionsRepo trans;
    @Autowired
    TransactionValidation transValidation;
    @Autowired
    UserRepo userRepo;


    public String submitTransaction(long debit_account_number, long credit_account_number,
                                    double amount) {
        // Implement transaction processing logic here
        Transactions transaction = new Transactions(debit_account_number, credit_account_number,
                amount, Instant.now(), 1);
        trans.save(transaction);
        return transValidation.validateTransaction(transaction);
        }
    public List<Transactions> getAllTransactions() {
        return trans.findAll();
    }
    public List<Transactions> getTransactionDetailsByDate(Instant i1, Instant i2) {
        // Implement transaction details retrieval logic here
        return trans.findAllByTimeDateBetween(i1, i2);
    }
    public List<Transactions> getTransactionDetailsByCreditAccountNumber(long account_number) {
        return trans.findAllByCreditAccountNumberEquals(account_number);
    }
    public List<Transactions> getTransactionDetailsByDebitAccountNumber(long account_number) {
        return trans.findAllByDebitAccountNumberEquals(account_number);
    }
    public List<Transactions> getTransactionDetailsByAmountBetween(double amount1, double amount2) {
        return trans.findAllByAmountBetween(amount1, amount2);
    }

//    public void handleDateAndTime(Instant instant) {
//        LocalTime time = LocalTime.ofInstant(instant, ZoneId.systemDefault());
//        int hour = time.getHour();
//        int minute = time.getMinute();
//        int second = time.getSecond();
//    }



}
