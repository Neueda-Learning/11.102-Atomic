package com.example.Atomic.Service;

import com.example.Atomic.Model.Alert;
import com.example.Atomic.Model.Rules;
import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Repository.AlertRepo;
import com.example.Atomic.Repository.RulesRepo;
import com.example.Atomic.Repository.TransactionsRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertProcessingTest {

    @Mock
    private AlertRepo alertRepo;

    @Mock
    private RulesRepo rulesRepo;

    @Mock
    private TransactionsRepo transactionsRepo;

    @InjectMocks
    private AlertProcessing alertProcessing;

    @Test
    void getAllAlerts_delegatesToRepository() {
        List<Alert> expected = List.of(new Alert(101L, 1L, 1, Instant.now(), null));
        when(alertRepo.findAllByAccountNumber(101L)).thenReturn(expected);

        List<Alert> actual = alertProcessing.getAllAlerts(101L);

        assertSame(expected, actual);
        verify(alertRepo).findAllByAccountNumber(101L);
    }

    @Test
    void getAllAlertsByStatus_delegatesToRepository() {
        List<Alert> expected = List.of(new Alert(101L, 2L, 2, Instant.now(), null));
        when(alertRepo.findAllByAccountNumberAndStatusEquals(101L, 2)).thenReturn(expected);

        List<Alert> actual = alertProcessing.getAllAlertsByStatus(101L, 2);

        assertSame(expected, actual);
        verify(alertRepo).findAllByAccountNumberAndStatusEquals(101L, 2);
    }

    @Test
    void getAllAlertsByRuleId_delegatesToRepository() {
        List<Alert> expected = List.of(new Alert(101L, 5L, 1, Instant.now(), null));
        when(alertRepo.findAllByAccountNumberAndAlertIDEquals(101L, 5L)).thenReturn(expected);

        List<Alert> actual = alertProcessing.getAllAlertsByRuleId(101L, 5L);

        assertSame(expected, actual);
        verify(alertRepo).findAllByAccountNumberAndAlertIDEquals(101L, 5L);
    }

    @Test
    void acknowledgeAlert_changesStatusToAcknowledged() {
        Alert alert = new Alert(101L, 1L, 1, Instant.now(), null);

        String result = alertProcessing.acknowledgeAlert(alert);

        assertEquals("Alert Acknowledged!", result);
        assertEquals(2, alert.getStatus());
    }

    @Test
    void closeAlert_changesStatusToClosed() {
        Alert alert = new Alert(101L, 1L, 2, Instant.now(), null);

        String result = alertProcessing.closeAlert(alert);

        assertEquals("Alert Closed!", result);
        assertEquals(3, alert.getStatus());
    }

    @Test
    void generateAlert6_savesFailedTransactionAlert_whenMoreThanThreeFailedToday()
            throws InterruptedException {
        Rules rule = new Rules(6L, "Multiple Failed Transactions", 1, 2);
        List<Transactions> failedTransactions = List.of(
                transaction(101L, 201L, 10.0, 5),
                transaction(101L, 202L, 20.0, 5),
                transaction(101L, 203L, 30.0, 5),
                transaction(101L, 204L, 40.0, 5)
        );
        when(transactionsRepo.findAllByDebitAccountNumberEquals(101L))
                .thenReturn(failedTransactions);
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        alertProcessing.generateAlert6(101L, 0);

        verify(alertRepo).saveAll(argThat(alerts -> containsSingleAlert(alerts, 6L)));
    }

    @Test
    void generateAlert_savesAmountThresholdAlert_whenTransactionExceedsConfiguredLimit()
            throws InterruptedException {
        Rules rule = new Rules(1L, "Amount Threshold Check", 1, 3);
        Transactions transaction = transaction(101L, 202L, 1000.01, 4);
        when(transactionsRepo.findAllByDebitAccountNumberEquals(101L))
                .thenReturn(List.of(transaction));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        alertProcessing.generateAlert(101L, 0);

        verify(alertRepo).saveAll(argThat(alerts -> containsSingleAlert(alerts, 1L)));
    }

    private Transactions transaction(long debit, long credit, double amount, int status) {
        return new Transactions(debit, credit, amount, Instant.now(), status);
    }

    private boolean containsSingleAlert(Iterable<? extends Alert> alerts, long ruleId) {
        java.util.Iterator<? extends Alert> iterator = alerts.iterator();
        if (!iterator.hasNext()) {
            return false;
        }
        Alert first = iterator.next();
        return first.getAlert_id() == ruleId && !iterator.hasNext();
    }
}
