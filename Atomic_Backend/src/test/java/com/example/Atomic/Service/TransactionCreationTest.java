package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.TransactionsRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionCreationTest {

    @Mock
    private TransactionsRepo transactionsRepo;

    @Mock
    private TransactionValidation transactionValidation;

    @InjectMocks
    private TransactionCreation transactionCreation;

    @Test
    void submitTransaction_savesThenValidatesAndReturnsCreatedMessage() throws InterruptedException {
        doAnswer((invocation) -> {
            Transactions saved = invocation.getArgument(0);
            saved.setTransID(123L);
            return saved;
        }).when(transactionsRepo).save(org.mockito.ArgumentMatchers.any(Transactions.class));

        String result = transactionCreation.submitTransaction(101L, 202L, 250.50);

        ArgumentCaptor<Transactions> transactionCaptor = ArgumentCaptor.forClass(Transactions.class);
        verify(transactionsRepo).save(transactionCaptor.capture());
        Transactions captured = transactionCaptor.getValue();

        assertEquals(101L, captured.getDebitAccountNumber());
        assertEquals(202L, captured.getCreditAccountNumber());
        assertEquals(250.50, captured.getAmount(), 0.0001);
        assertEquals(1, captured.getStatus());
        assertNotNull(captured.getTimeDate());
        verify(transactionValidation).validateTransaction(captured);
        assertEquals("Transaction ID: 123 created successfully!", result);
    }

    @Test
    void getAllTransactions_returnsRepositoryData() {
        List<Transactions> expected = List.of(
                new Transactions(1L, 2L, 10.0, Instant.now(), 4),
                new Transactions(1L, 3L, 20.0, Instant.now(), 5)
        );
        when(transactionsRepo.findAll()).thenReturn(expected);

        List<Transactions> actual = transactionCreation.getAllTransactions();

        assertSame(expected, actual);
        verify(transactionsRepo).findAll();
    }

    @Test
    void getTransactionDetailsByDate_delegatesToRepository() {
        Instant from = Instant.parse("2026-08-01T00:00:00Z");
        Instant to = Instant.parse("2026-08-02T00:00:00Z");
        List<Transactions> expected = List.of(new Transactions(1L, 2L, 30.0, Instant.now(), 4));
        when(transactionsRepo.findAllByTimeDateBetween(from, to)).thenReturn(expected);

        List<Transactions> actual = transactionCreation.getTransactionDetailsByDate(from, to);

        assertSame(expected, actual);
        verify(transactionsRepo).findAllByTimeDateBetween(from, to);
    }

    @Test
    void getTransactionDetailsByCreditAccountNumber_delegatesToRepository() {
        List<Transactions> expected = List.of(new Transactions(11L, 22L, 40.0, Instant.now(), 4));
        when(transactionsRepo.findAllByCreditAccountNumberEquals(22L)).thenReturn(expected);

        List<Transactions> actual = transactionCreation.getTransactionDetailsByCreditAccountNumber(22L);

        assertSame(expected, actual);
        verify(transactionsRepo).findAllByCreditAccountNumberEquals(22L);
    }

    @Test
    void getTransactionDetailsByDebitAccountNumber_delegatesToRepository() {
        List<Transactions> expected = List.of(new Transactions(11L, 22L, 40.0, Instant.now(), 4));
        when(transactionsRepo.findAllByDebitAccountNumberEquals(11L)).thenReturn(expected);

        List<Transactions> actual = transactionCreation.getTransactionDetailsByDebitAccountNumber(11L);

        assertSame(expected, actual);
        verify(transactionsRepo).findAllByDebitAccountNumberEquals(11L);
    }

    @Test
    void getTransactionDetailsByAmountBetween_delegatesToRepository() {
        List<Transactions> expected = List.of(new Transactions(11L, 22L, 75.0, Instant.now(), 4));
        when(transactionsRepo.findAllByAmountBetween(50.0, 100.0)).thenReturn(expected);

        List<Transactions> actual = transactionCreation.getTransactionDetailsByAmountBetween(50.0, 100.0);

        assertSame(expected, actual);
        verify(transactionsRepo).findAllByAmountBetween(50.0, 100.0);
    }

    @Test
    void scheduleTransaction_truncatesToMinuteAndSetsCreatedForFutureTime() throws InterruptedException {
        Instant requested = Instant.now().plusSeconds(600).plusMillis(321);
        when(transactionsRepo.save(any(Transactions.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Transactions result = transactionCreation.scheduleTransaction(11L, 22L, 75.0, requested);

        assertEquals(1, result.getStatus());
        assertEquals(59, result.getTimeDate().getEpochSecond() % 60);
        assertEquals(0, result.getTimeDate().getNano());
        verify(transactionsRepo).save(result);
        verify(transactionValidation, org.mockito.Mockito.never())
                .validateTransaction(any(Transactions.class));
    }

    @Test
    void scheduleTransaction_marksPastTimeFailedWithoutValidation() throws InterruptedException {
        when(transactionsRepo.save(any(Transactions.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Transactions result = transactionCreation.scheduleTransaction(
                11L,
                22L,
                75.0,
                Instant.now().minusSeconds(60)
        );

        assertEquals(5, result.getStatus());
        verify(transactionValidation, org.mockito.Mockito.never())
                .validateTransaction(any(Transactions.class));
    }

    @Test
    void processDueTransactions_validatesEveryDueTransaction() throws InterruptedException {
        Transactions first = new Transactions(1L, 2L, 10.0, Instant.now(), 1);
        Transactions second = new Transactions(1L, 3L, 20.0, Instant.now(), 1);
        when(transactionsRepo.findDueTransactions(any(Instant.class)))
                .thenReturn(List.of(first, second));
        doAnswer(invocation -> {
            Transactions transaction = invocation.getArgument(0);
            transaction.setStatus(4);
            return "Transaction is valid.";
        }).when(transactionValidation).validateTransaction(any(Transactions.class));

        transactionCreation.processDueTransactions();

        verify(transactionValidation).validateTransaction(first);
        verify(transactionValidation).validateTransaction(second);
    }
}
