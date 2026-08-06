package com.example.Atomic.Service;

import com.example.Atomic.Model.Rules;
import com.example.Atomic.Repository.RulesRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RulesProcessingTest {

    @Mock
    private RulesRepo rulesRepo;

    @InjectMocks
    private RulesProcessing rulesProcessing;

    @Test
    void getRules_returnsAllRulesFromRepository() {
        Rules rule1 = new Rules(1L, "Rule A", 1, 2);
        Rules rule2 = new Rules(2L, "Rule B", 2, 4);
        List<Rules> expected = List.of(rule1, rule2);

        when(rulesRepo.findAll()).thenReturn(expected);

        List<Rules> actual = rulesProcessing.getRules();

        assertSame(expected, actual);
        verify(rulesRepo).findAll();
    }

    @Test
    void getRulesByStatus_returnsMatchingRules() {
        List<Rules> expected = List.of(new Rules(1L, "Rule A", 1, 2));

        when(rulesRepo.findAllByAlertStatusEquals(1)).thenReturn(expected);

        List<Rules> actual = rulesProcessing.getRulesByStatus(1);

        assertSame(expected, actual);
        verify(rulesRepo).findAllByAlertStatusEquals(1);
    }

    @Test
    void getRulesBySeverity_returnsMatchingRules() {
        List<Rules> expected = List.of(new Rules(9L, "Rule C", 1, 3));

        when(rulesRepo.findAllByAlertSeverityEquals(3)).thenReturn(expected);

        List<Rules> actual = rulesProcessing.getRulesBySeverity(3);

        assertSame(expected, actual);
        verify(rulesRepo).findAllByAlertSeverityEquals(3);
    }

    @Test
    void updateRulesSeverityByID_updatesAndSavesRule_whenRuleExists() {
        Rules existing = new Rules(10L, "Rule", 1, 1);
        when(rulesRepo.findById(10L)).thenReturn(Optional.of(existing));

        String result = rulesProcessing.updateRulesSeverityByID(10L, 4);

        assertEquals("Rules updated successfully!", result);
        assertEquals(4, existing.getAlertSeverity());
        verify(rulesRepo).save(existing);
    }

    @Test
    void updateRulesSeverityByID_returnsNotFound_whenRuleMissing() {
        when(rulesRepo.findById(999L)).thenReturn(Optional.empty());

        String result = rulesProcessing.updateRulesSeverityByID(999L, 4);

        assertEquals("Rule not found!", result);
        verify(rulesRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateRulesNameByID_updatesAndSavesRule_whenRuleExists() {
        Rules existing = new Rules(20L, "Old", 1, 2);
        when(rulesRepo.findById(20L)).thenReturn(Optional.of(existing));

        String result = rulesProcessing.updateRulesNameByID(20L, "New Name");

        assertEquals("Rules updated successfully!", result);
        assertEquals("New Name", existing.getAlertName());
        verify(rulesRepo).save(existing);
    }

    @Test
    void updateRulesNameByID_returnsNotFound_whenRuleMissing() {
        when(rulesRepo.findById(404L)).thenReturn(Optional.empty());

        String result = rulesProcessing.updateRulesNameByID(404L, "Anything");

        assertEquals("Rule not found!", result);
        verify(rulesRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateRulesStatusByID_updatesAndSavesRule_whenRuleExists() {
        Rules existing = new Rules(30L, "Status Rule", 1, 2);
        when(rulesRepo.findById(30L)).thenReturn(Optional.of(existing));

        String result = rulesProcessing.updateRulesStatusByID(30L, 2);

        assertEquals("Rules updated successfully!", result);
        assertEquals(2, existing.getAlertStatus());
        verify(rulesRepo).save(existing);
    }

    @Test
    void updateRulesStatusByID_returnsNotFound_whenRuleMissing() {
        when(rulesRepo.findById(405L)).thenReturn(Optional.empty());

        String result = rulesProcessing.updateRulesStatusByID(405L, 2);

        assertEquals("Rule not found!", result);
        verify(rulesRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }
}

