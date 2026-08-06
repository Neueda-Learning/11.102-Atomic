package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Model.User;
import com.example.Atomic.Repository.TransactionsRepo;
import com.example.Atomic.Repository.UserRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionProcessingTest {

    @Mock
    private TransactionsRepo transactionsRepo;

    @Mock
    private UserRepo userRepo;

    @InjectMocks
    private TransactionProcessing transactionProcessing;

    @Test
    void processTransaction_returnsError_whenTransactionIsNull() {
        String result = transactionProcessing.processTransaction(null);

        assertEquals("Transaction payload is required.", result);
        verify(transactionsRepo, never()).save(org.mockito.ArgumentMatchers.any());
        verify(userRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void processTransaction_fails_whenAmountIsInvalid() {
        Transactions transaction = new Transactions(1L, 2L, 0, Instant.now(), 1);

        String result = transactionProcessing.processTransaction(transaction);

        assertEquals("Transaction amount must be greater than 0.", result);
        assertEquals(5, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(userRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void processTransaction_fails_whenDebitAccountMissing() {
        Transactions transaction = new Transactions(101L, 202L, 50.0, Instant.now(), 2);
        when(userRepo.findByAccountNumber(101L)).thenReturn(null);

        String result = transactionProcessing.processTransaction(transaction);

        assertEquals("Debit account 101 does not exist.", result);
        assertEquals(5, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(userRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void processTransaction_fails_whenCreditAccountMissing() {
        Transactions transaction = new Transactions(101L, 202L, 50.0, Instant.now(), 2);
        User debitUser = userWithAccount(101L, 1000.0);

        when(userRepo.findByAccountNumber(101L)).thenReturn(debitUser);
        when(userRepo.findByAccountNumber(202L)).thenReturn(null);

        String result = transactionProcessing.processTransaction(transaction);

        assertEquals("Credit account 202 does not exist.", result);
        assertEquals(5, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(userRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void processTransaction_fails_whenInsufficientFunds() {
        Transactions transaction = new Transactions(101L, 202L, 500.0, Instant.now(), 2);
        User debitUser = userWithAccount(101L, 100.0);
        User creditUser = userWithAccount(202L, 250.0);

        when(userRepo.findByAccountNumber(101L)).thenReturn(debitUser);
        when(userRepo.findByAccountNumber(202L)).thenReturn(creditUser);

        String result = transactionProcessing.processTransaction(transaction);

        assertEquals("Insufficient funds in debit account 101.", result);
        assertEquals(5, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(userRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void processTransaction_updatesBalancesAndCompletes_whenValid() {
        Transactions transaction = new Transactions(101L, 202L, 75.5, Instant.now(), 2);
        User debitUser = userWithAccount(101L, 500.0);
        User creditUser = userWithAccount(202L, 100.0);

        when(userRepo.findByAccountNumber(101L)).thenReturn(debitUser);
        when(userRepo.findByAccountNumber(202L)).thenReturn(creditUser);

        String result = transactionProcessing.processTransaction(transaction);

        assertEquals("Transaction processed successfully!", result);
        assertEquals(424.5, debitUser.getBalance(), 0.0001);
        assertEquals(175.5, creditUser.getBalance(), 0.0001);
        assertEquals(4, transaction.getStatus());

        verify(userRepo, times(2)).save(org.mockito.ArgumentMatchers.any(User.class));
        verify(transactionsRepo).save(transaction);
    }

    private User userWithAccount(long accountNumber, double balance) {
        User user = new User();
        user.setAccountNumber(accountNumber);
        user.setBalance(balance);
        return user;
    }
}

