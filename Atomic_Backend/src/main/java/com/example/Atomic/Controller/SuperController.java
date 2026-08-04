package com.example.Atomic.Controller;

import com.example.Atomic.Model.Rules;
import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Model.User;
import com.example.Atomic.Service.RulesProcessing;
import com.example.Atomic.Service.TransactionCreation;
import com.example.Atomic.Service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/home")
public class SuperController {

    @Autowired
    TransactionCreation trans;
    @Autowired
    RulesProcessing  rules;
    @Autowired
    UserService user;

    // post transaction
    @PostMapping("/transaction/submit")
    public String SubmitTransaction(@SessionAttribute(name = SuperController.LOGGED_IN_ACCOUNT, required = false)
                                        long debit_account_number, long credit_account_number, double amount) {
        return trans.submitTransaction(debit_account_number, credit_account_number, amount);
        }

    // fetch transaction details By Debit Account Number
    @GetMapping("/transaction/fetch/debit")
    public List<Transactions> GetTransactionDetailsByDebitAccountNumber(long debit_account_number) {
        return trans.getTransactionDetailsByDebitAccountNumber(debit_account_number);
    }

    // fetch transaction details By Credit Account Number
    @GetMapping("/transaction/fetch/credit")
    public List<Transactions> GetTransactionDetailsByCreditAccountNumber(long credit_account_number){
        return trans.getTransactionDetailsByCreditAccountNumber(credit_account_number);
    }

    // fetch transaction details By Amount Range
    @GetMapping("/transaction/fetch/amount")
    public List<Transactions> GetTransactionDetailsByAmountBetween(double amountAfter, double amountBefore){
        return trans.getTransactionDetailsByAmountBetween(amountAfter, amountBefore);
    }

    // fetch transaction details By Date and Time Range
    @GetMapping("/transaction/fetch/date")
    public List<Transactions> GetTransactionDetailsByDate(Instant date1, Instant date2){
        return trans.getTransactionDetailsByDate(date1, date2);
    }

    // update alert status
    @PostMapping("/alert/update")
    public String UpdateAlertStatus() {
        // Implement alert status update logic here
        return "Alert status updated successfully!";
    }

    // fetch alert status
    @GetMapping("/alert")
    public String GetAlert() {
        // Implement alert retrieval logic here
        return "Alert message";
    }

    // update rules
    @PutMapping("/rules/update")
    public String UpdateRules(long id,  String name, int status, int severity) {
        String result = "";
        if (name != null && !name.isEmpty()) {
            result = rules.updateRulesNameByID(id, name);
        }
        if (status != 0) {
            result = rules.updateRulesStatusByID(id, status);
        }
        if (severity != 0) {
            result = rules.updateRulesSeverityByID(id, severity);
        }
        return result;
    }

    // fetch all rules
    @GetMapping("/rules")
    public List<Rules> GetRules() {
        return rules.getRules();
    }

    // fetch rules by status
    @GetMapping("/rules/status")
    public List<Rules> getRulesByStatus(@RequestParam int status) {
        return rules.getRulesByStatus(status);
    }

    // fetch rules by severity
    @GetMapping("/rules/severity")
    public List<Rules> getRulesBySeverity(@RequestParam int severity) {
        return rules.getRulesBySeverity(severity);
    }

    // submit all user details for signup
    @PostMapping("/signup")
    public String Signup(Double balance, String firstName, String lastName,
                         String email, String password) {
        user.createUser(balance, firstName, lastName, email, password);
        return "User Signup successful!";
    }

    // LOGIN
    // 3 methods -> login, getCurrentUser and logout

    public static final String LOGGED_IN_ACCOUNT = "LOGGED_IN_ACCOUNT";

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login( @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        Optional<User> authenticatedUser =
                Optional.ofNullable(user.fetchAfterAuthenticate(loginRequest.email(), loginRequest.password()));
        if (authenticatedUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authenticatedUser.get();
        HttpSession previousSession = request.getSession(false);
        if (previousSession != null) {
            previousSession.invalidate();
        }
        HttpSession newSession = request.getSession(true);
        newSession.setAttribute(LOGGED_IN_ACCOUNT, user.getAccountNumber());
        UserResponse response = UserResponse.from(user);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/myProfile")
    public ResponseEntity<UserResponse> getCurrentUser(
            @SessionAttribute(name = LOGGED_IN_ACCOUNT, required = false) Long accountNumber) {
        if (accountNumber == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<User> userOptional = user.findUser(accountNumber);
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(UserResponse.from(userOptional.get()));
    }

    // have to define "findUser" method...
//    @GetMapping("/myProfile")
//    public ResponseEntity<UserResponse> getCurrentUser(@SessionAttribute(name = LOGGED_IN_ACCOUNT, required = false)
//                                                           Long accountNumber){
//        if (accountNumber == null) {
//            return ResponseEntity
//                    .status(HttpStatus.UNAUTHORIZED)
//                    .build();
//        }
//        Optional<User> userOptional =
//                user.findUser(accountNumber);
//        if (userOptional.isEmpty()) {
//            return ResponseEntity.notFound().build();
//        }
//        UserResponse response =
//                UserResponse.from(userOptional.get());
//        return ResponseEntity.ok(response);
//    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.noContent().build();
    }
    public record LoginRequest(String email, String password) {
    }
    public record UserResponse(Long accountNumber, Double balance, String firstName, String lastName,
                               String email) {
        public static UserResponse from(User user) {
            return new UserResponse(
                    user.getAccountNumber(),
                    user.getBalance(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getEmail()
                    //user.getPassword()
            );
        }
    }
}
