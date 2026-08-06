package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionValidationTest {

    @Mock
    private TransactionsRepo transactionsRepo;

    @Mock
    private TransactionProcessing transactionProcessing;

    @Mock
    private AlertProcessing alertProcessing;

    @InjectMocks
    private TransactionValidation transactionValidation;

    @Test
    void validateTransaction_fails_whenAmountIsZeroOrNegative() throws InterruptedException {
        Transactions transaction = new Transactions(101L, 202L, 0.0, Instant.now(), 1);

        String result = transactionValidation.validateTransaction(transaction);

        assertEquals("Transaction amount must be greater than 0.", result);
        assertEquals(5, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(transactionProcessing, never()).processTransaction(transaction);
    }

    @Test
    void validateTransaction_fails_whenAccountNumbersAreNonPositive() throws InterruptedException {
        Transactions transaction = new Transactions(0L, 202L, 100.0, Instant.now(), 1);

        String result = transactionValidation.validateTransaction(transaction);

        assertEquals("Credit and debit account numbers must be positive.", result);
        assertEquals(5, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(transactionProcessing, never()).processTransaction(transaction);
    }

    @Test
    void validateTransaction_fails_whenDebitAndCreditAreSame() throws InterruptedException {
        Transactions transaction = new Transactions(555L, 555L, 100.0, Instant.now(), 1);

        String result = transactionValidation.validateTransaction(transaction);

        assertEquals("Credit and debit account numbers must not be equal.", result);
        assertEquals(5, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(transactionProcessing, never()).processTransaction(transaction);
    }

    @Test
    void validateTransaction_marksValidatedAndCallsProcessing_whenInputIsValid() throws InterruptedException {
        Transactions transaction = new Transactions(101L, 202L, 250.0, Instant.now(), 1);
        when(transactionProcessing.processTransaction(transaction))
                .thenReturn("Transaction processed successfully!");

        String result = transactionValidation.validateTransaction(transaction);

        assertEquals("Transaction is valid.", result);
        assertEquals(2, transaction.getStatus());
        verify(transactionsRepo).save(transaction);
        verify(transactionProcessing).processTransaction(transaction);
        verify(alertProcessing).generateAlert6(101L, 0);
    }
}
