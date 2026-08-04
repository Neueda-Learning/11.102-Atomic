package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import com.example.Atomic.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TransactionProcessing {
    private final TransactionsRepo trans ;
    private final AccountBalanceTransferService accountBalanceTransferService;


    @Autowired

    public TransactionProcessing(TransactionsRepo trans, AccountBalanceTransferService accountBalanceTransferService) {
        this.trans = trans;
        this.accountBalanceTransferService = accountBalanceTransferService;
    }
    public String processTransaction(Transactions transaction) {
        try {
            accountBalanceTransferService.transfer(transaction);
            transaction.setStatus(4); // completed
            trans.save(transaction);
            return "Transaction processed successfully!";
        } catch (AccountBalanceTransferService.BalanceTransferException ex) {
            transaction.setStatus(5); // failed
            trans.save(transaction);
            return "Transaction failed: " + ex.getMessage();
        }
    }
}
