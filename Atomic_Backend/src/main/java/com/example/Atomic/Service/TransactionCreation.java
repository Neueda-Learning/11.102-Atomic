package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import com.example.Atomic.Repository.UserRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class TransactionCreation {
    @Autowired
    TransactionsRepo trans;
    @Autowired
    TransactionValidation transValidation;
    @Autowired
    UserRepo userRepo;


    public List<Transactions> getAllTransactions() {
        return trans.findAll();
    }

    public List<Transactions> getTransactionDetailsByDate(
            Instant i1,
            Instant i2) {

        return trans.findAllByTimeDateBetween(i1, i2);
    }

    public List<Transactions> getTransactionDetailsByCreditAccountNumber(
            long account_number) {

        return trans.findAllByCreditAccountNumberEquals(account_number);
    }

    public List<Transactions> getTransactionDetailsByDebitAccountNumber(
            long account_number) {

        return trans.findAllByDebitAccountNumberEquals(account_number);
    }

    public List<Transactions> getTransactionDetailsByAmountBetween(
            double amount1,
            double amount2) {

        return trans.findAllByAmountBetween(amount1, amount2);
    }

    // Creating regular old joe transactions...
    public String submitTransaction(long debit_account_number, long credit_account_number,
                                    double amount) {
        // Implement transaction processing logic here
        Transactions transaction = new Transactions(debit_account_number, credit_account_number,
                amount, Instant.now(), 1);
        trans.save(transaction);
        transValidation.validateTransaction(transaction);
        return "Transaction ID: " + transaction.getTransID() + " created successfully!";
    }

//    public void handleDateAndTime(Instant instant) {
//        LocalTime time = LocalTime.ofInstant(instant, ZoneId.systemDefault());
//        int hour = time.getHour();
//        int minute = time.getMinute();
//        int second = time.getSecond();
//    }

    /*
     * Creates a transaction that will be processed later.
     * Validation and balance handling are not called here.
     */
    public Transactions scheduleTransaction(
            long debitAccountNumber,
            long creditAccountNumber,
            double amount,
            Instant requestedProcessingTime) {

        Instant createdAt = Instant.now();

        Instant processingTime = requestedProcessingTime
                .truncatedTo(ChronoUnit.MINUTES)
                .plusSeconds(59);

        int initialStatus =
                processingTime.isBefore(createdAt.plusSeconds(60))
                        ? 5
                        : 1;

        Transactions transaction = new Transactions(
                debitAccountNumber,
                creditAccountNumber,
                amount,
                processingTime,
                initialStatus
        );

        return trans.save(transaction);
    }

    private static final String PROCESSING_ZONE = "UTC";

    /*
     * Runs at second 59 of every minute.
     */
    @Scheduled(cron = "59 * * * * *", zone = PROCESSING_ZONE)
    public void processDueTransactions() {

        List<Transactions> dueTransactions =
                trans.findDueTransactions(Instant.now());

        for (Transactions transaction : dueTransactions) {
            try {
                transValidation.validateTransaction(transaction);
                while(transaction.getStatus()<4) {
                    Thread.sleep(100); // added a network delay simulator so that the next one has to wait...
                }
            }
            catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return;
            }
            catch (RuntimeException exception) {
                transaction.setStatus(5);
                trans.save(transaction);
            }
        }
    }
}
