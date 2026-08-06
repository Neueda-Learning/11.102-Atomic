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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
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

    // ── helpers ─────────────────────────────────────────────────────────────

    private Rules activeRule(long id, String name, int severity) {
        return new Rules(id, name, 1, severity);
    }

    private Transactions txAt(long debit, long credit, double amount, Instant time) {
        return new Transactions(debit, credit, amount, time, 4);
    }

    // ── getAlert ─────────────────────────────────────────────────────────────

    @Test
    void getAlert_returnsAlertMessage() {
        assertEquals("Alert message", alertProcessing.getAlert());
    }

    // ── no active rules ───────────────────────────────────────────────────────

    @Test
    void generateAlert_returnsEmptyList_whenNoActiveRules() {
        when(transactionsRepo.findAllByDebitAccountNumberEquals(1L)).thenReturn(List.of());
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of());

        List<Alert> result = alertProcessing.generateAlert(1L, 0);

        assertTrue(result.isEmpty());
        verify(alertRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    // ── rule 1: High Value Transaction Detection ──────────────────────────────

    @Test
    void generateAlert_triggersHighValueAlert_whenAmountExceedsSeverityThreshold() {
        Rules rule = activeRule(1L, "High Value Transaction Detection", 2);
        // amount 100 > severity 2, so alert should fire
        Transactions tx = txAt(10L, 20L, 100.0, Instant.now());

        when(transactionsRepo.findAllByDebitAccountNumberEquals(10L)).thenReturn(List.of(tx));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        List<Alert> result = alertProcessing.generateAlert(10L, 0);

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getAlert_id());
        verify(alertRepo).save(org.mockito.ArgumentMatchers.any(Alert.class));
    }

    @Test
    void generateAlert_doesNotTriggerHighValueAlert_whenAmountBelowThreshold() {
        Rules rule = activeRule(1L, "High Value Transaction Detection", 200);
        // amount 50 < severity 200, so no alert
        Transactions tx = txAt(10L, 20L, 50.0, Instant.now());

        when(transactionsRepo.findAllByDebitAccountNumberEquals(10L)).thenReturn(List.of(tx));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        List<Alert> result = alertProcessing.generateAlert(10L, 0);

        assertTrue(result.isEmpty());
        verify(alertRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    // ── rule 2: Frequent Transaction Exceeds Limit ────────────────────────────

    @Test
    void generateAlert_triggersFrequentTransactionAlert_whenCountExceedsThreshold() {
        // severity = 1, so count > 1 is needed; we supply 2 recent transactions
        Rules rule = activeRule(2L, "Frequent Transaction Exceeds Limit", 1);
        Instant now = Instant.now();
        Transactions tx1 = txAt(10L, 20L, 10.0, now.minusSeconds(60));
        Transactions tx2 = txAt(10L, 21L, 20.0, now.minusSeconds(120));

        when(transactionsRepo.findAllByDebitAccountNumberEquals(10L)).thenReturn(List.of(tx1, tx2));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        List<Alert> result = alertProcessing.generateAlert(10L, 0);

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getAlert_id());
        verify(alertRepo).save(org.mockito.ArgumentMatchers.any(Alert.class));
    }

    // ── rule 5: New Payee detection (blacklisted credit account) ─────────────

    @Test
    void generateAlert_triggersBlacklistedAccountAlert_whenCreditIsBlacklisted() {
        Rules rule = activeRule(5L, "New Payee detection", 3);
        // 9999999999L is a hard-coded blacklisted account in AlertProcessing
        Transactions tx = txAt(10L, 9999999999L, 50.0, Instant.now());

        when(transactionsRepo.findAllByDebitAccountNumberEquals(10L)).thenReturn(List.of(tx));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        List<Alert> result = alertProcessing.generateAlert(10L, 0);

        assertEquals(1, result.size());
        assertEquals(5L, result.get(0).getAlert_id());
        verify(alertRepo).save(org.mockito.ArgumentMatchers.any(Alert.class));
    }

    @Test
    void generateAlert_doesNotTriggerBlacklistedAlert_whenCreditIsNormal() {
        Rules rule = activeRule(5L, "New Payee detection", 3);
        Transactions tx = txAt(10L, 202L, 50.0, Instant.now());

        when(transactionsRepo.findAllByDebitAccountNumberEquals(10L)).thenReturn(List.of(tx));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        List<Alert> result = alertProcessing.generateAlert(10L, 0);

        assertTrue(result.isEmpty());
        verify(alertRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    // ── rule 6: Multiple Failed Transactions (blacklisted debit) ─────────────

    @Test
    void generateAlert_triggersMultipleFailedAlert_whenDebitIsBlacklisted() {
        // Note: rule name has a trailing space in AlertProcessing source
        Rules rule = activeRule(6L, "Multiple Failed Transactions ", 2);
        Transactions tx = txAt(8888888888L, 20L, 50.0, Instant.now());

        when(transactionsRepo.findAllByDebitAccountNumberEquals(8888888888L)).thenReturn(List.of(tx));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(rule));

        List<Alert> result = alertProcessing.generateAlert(8888888888L, 0);

        assertEquals(1, result.size());
        assertEquals(6L, result.get(0).getAlert_id());
        verify(alertRepo).save(org.mockito.ArgumentMatchers.any(Alert.class));
    }

    // ── multiple rules together ────────────────────────────────────────────────

    @Test
    void generateAlert_triggersMultipleAlerts_whenSeveralRulesMatch() {
        Rules r1 = activeRule(1L, "High Value Transaction Detection", 2);
        Rules r5 = activeRule(5L, "New Payee detection", 3);
        // amount 999 > severity 2; credit is blacklisted
        Transactions tx = txAt(10L, 9999999999L, 999.0, Instant.now());

        when(transactionsRepo.findAllByDebitAccountNumberEquals(10L)).thenReturn(List.of(tx));
        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(List.of(r1, r5));

        List<Alert> result = alertProcessing.generateAlert(10L, 0);

        assertEquals(2, result.size());
    }
}

