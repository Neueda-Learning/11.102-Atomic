package com.example.Atomic.Controller;

import com.example.Atomic.Model.Rules;
import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Model.User;
import com.example.Atomic.Service.RulesProcessing;
import com.example.Atomic.Service.TransactionCreation;
import com.example.Atomic.Service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SuperControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private TransactionCreation transactionCreation;

    @Mock
    private RulesProcessing rulesProcessing;

    @Mock
    private UserService userService;

    @InjectMocks
    private SuperController superController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(superController).build();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private User buildUser(long accountNumber, double balance) {
        User u = new User();
        u.setAccountNumber(accountNumber);
        u.setBalance(balance);
        u.setFirstName("Jane");
        u.setLastName("Doe");
        u.setEmail("jane@example.com");
        return u;
    }

    // ── POST /home/transaction/submit ─────────────────────────────────────────

    @Test
    void submitTransaction_returns200_whenSessionPresent() throws Exception {
        mockMvc.perform(post("/home/transaction/submit")
                        .sessionAttr(SuperController.LOGGED_IN_ACCOUNT, 101L)
                        .param("credit_account_number", "202")
                        .param("amount", "100.00"))
                .andExpect(status().isOk())
                .andExpect(content().string("Transaction processed successfully!"));

        verify(transactionCreation).submitTransaction(101L, 202L, 100.00);
    }

    @Test
    void submitTransaction_returns401_whenSessionMissing() throws Exception {
        mockMvc.perform(post("/home/transaction/submit")
                        .param("credit_account_number", "202")
                        .param("amount", "100.00"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Login required. Please sign in again."));
    }

    // ── GET /home/transaction/fetch/debit ─────────────────────────────────────

    @Test
    void fetchByDebit_returnsTransactionList() throws Exception {
        Transactions tx = new Transactions(10L, 20L, 50.0, Instant.now(), 4);
        when(transactionCreation.getTransactionDetailsByDebitAccountNumber(10L))
                .thenReturn(List.of(tx));

        mockMvc.perform(get("/home/transaction/fetch/debit")
                        .param("debit_account_number", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].debitAccountNumber").value(10))
                .andExpect(jsonPath("$[0].amount").value(50.0));
    }

    // ── GET /home/transaction/fetch/credit ────────────────────────────────────

    @Test
    void fetchByCredit_returnsTransactionList() throws Exception {
        Transactions tx = new Transactions(10L, 20L, 75.0, Instant.now(), 4);
        when(transactionCreation.getTransactionDetailsByCreditAccountNumber(20L))
                .thenReturn(List.of(tx));

        mockMvc.perform(get("/home/transaction/fetch/credit")
                        .param("credit_account_number", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].creditAccountNumber").value(20));
    }

    // ── GET /home/transaction/fetch/amount ────────────────────────────────────

    @Test
    void fetchByAmount_returnsTransactionList() throws Exception {
        Transactions tx = new Transactions(10L, 20L, 60.0, Instant.now(), 4);
        when(transactionCreation.getTransactionDetailsByAmountBetween(50.0, 100.0))
                .thenReturn(List.of(tx));

        mockMvc.perform(get("/home/transaction/fetch/amount")
                        .param("amountAfter", "50.0")
                        .param("amountBefore", "100.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].amount").value(60.0));
    }

    // ── GET /home/alert ───────────────────────────────────────────────────────

    @Test
    void getAlert_returnsAlertMessage() throws Exception {
        mockMvc.perform(get("/home/alert"))
                .andExpect(status().isOk())
                .andExpect(content().string("Alert message"));
    }

    // ── POST /home/alert/update ───────────────────────────────────────────────

    @Test
    void updateAlertStatus_returnsSuccessMessage() throws Exception {
        mockMvc.perform(post("/home/alert/update"))
                .andExpect(status().isOk())
                .andExpect(content().string("Alert status updated successfully!"));
    }

    // ── GET /home/rules ───────────────────────────────────────────────────────

    @Test
    void getRules_returnsRuleList() throws Exception {
        Rules rule = new Rules(1L, "Amount Threshold", 1, 3);
        when(rulesProcessing.getRules()).thenReturn(List.of(rule));

        mockMvc.perform(get("/home/rules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertName").value("Amount Threshold"))
                .andExpect(jsonPath("$[0].alertSeverity").value(3));
    }

    // ── GET /home/rules/status ────────────────────────────────────────────────

    @Test
    void getRulesByStatus_returnsMatchingRules() throws Exception {
        Rules rule = new Rules(2L, "Velocity Check", 1, 2);
        when(rulesProcessing.getRulesByStatus(1)).thenReturn(List.of(rule));

        mockMvc.perform(get("/home/rules/status").param("status", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertStatus").value(1));
    }

    // ── GET /home/rules/severity ──────────────────────────────────────────────

    @Test
    void getRulesBySeverity_returnsMatchingRules() throws Exception {
        Rules rule = new Rules(3L, "High Risk Rule", 1, 4);
        when(rulesProcessing.getRulesBySeverity(4)).thenReturn(List.of(rule));

        mockMvc.perform(get("/home/rules/severity").param("severity", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertSeverity").value(4));
    }

    // ── PUT /home/rules/update ────────────────────────────────────────────────

    @Test
    void updateRules_callsNameUpdate_whenNameProvided() throws Exception {
        when(rulesProcessing.updateRulesNameByID(1L, "New Name"))
                .thenReturn("Rules updated successfully!");

        mockMvc.perform(put("/home/rules/update")
                        .param("id", "1")
                        .param("name", "New Name")
                        .param("status", "0")
                        .param("severity", "0"))
                .andExpect(status().isOk())
                .andExpect(content().string("Rules updated successfully!"));
    }

    @Test
    void updateRules_callsStatusUpdate_whenStatusNonZero() throws Exception {
        when(rulesProcessing.updateRulesStatusByID(1L, 2))
                .thenReturn("Rules updated successfully!");

        mockMvc.perform(put("/home/rules/update")
                        .param("id", "1")
                        .param("name", "")
                        .param("status", "2")
                        .param("severity", "0"))
                .andExpect(status().isOk())
                .andExpect(content().string("Rules updated successfully!"));
    }

    // ── POST /home/login ──────────────────────────────────────────────────────

    @Test
    void login_returns200AndUserResponse_whenCredentialsValid() throws Exception {
        User user = buildUser(101L, 5000.0);
        when(userService.fetchAfterAuthenticate("jane@example.com", "secret"))
                .thenReturn(user);

        mockMvc.perform(post("/home/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "jane@example.com", "password", "secret"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber").value(101))
                .andExpect(jsonPath("$.email").value("jane@example.com"))
                .andExpect(jsonPath("$.balance").value(5000.0));
    }

    @Test
    void login_returns401_whenCredentialsInvalid() throws Exception {
        when(userService.fetchAfterAuthenticate("jane@example.com", "wrong"))
                .thenReturn(null);

        mockMvc.perform(post("/home/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("email", "jane@example.com", "password", "wrong"))))
                .andExpect(status().isUnauthorized());
    }

    // ── POST /home/logout ─────────────────────────────────────────────────────

    @Test
    void logout_returns204_andInvalidatesSession() throws Exception {
        mockMvc.perform(post("/home/logout")
                        .sessionAttr(SuperController.LOGGED_IN_ACCOUNT, 101L))
                .andExpect(status().isNoContent());
    }
}




