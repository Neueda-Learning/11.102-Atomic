package com.example.Atomic.Service;

import com.example.Atomic.Model.Transactions;
import com.example.Atomic.Model.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class AccountBalanceTransferService {

    private static final int MONEY_SCALE = 2;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public BalanceTransferResult transfer(Transactions transaction) {
        if (transaction == null) {
            throw failure(BalanceErrorCode.PROCESSING_ERROR,
                    "Transaction details are required");
        }

        return transfer(
                transaction.getDebitAccountNumber(),
                transaction.getCreditAccountNumber(),
                transaction.getAmount()
        );
    }

    @Transactional
    public BalanceTransferResult transfer(long debitAccountNumber,
                                          long creditAccountNumber,
                                          double amount) {
        validateAccountNumbers(debitAccountNumber, creditAccountNumber);
        BigDecimal transferAmount = requireMoneyAmount(amount);

        // locking the smaller key first to make concurrent transfers safe.
        long firstAccountNumber = Math.min(debitAccountNumber, creditAccountNumber);
        long secondAccountNumber = Math.max(debitAccountNumber, creditAccountNumber);

        User firstAccount = findAndLock(firstAccountNumber);
        User secondAccount = findAndLock(secondAccountNumber);

        User debitAccount = debitAccountNumber == firstAccountNumber
                ? firstAccount
                : secondAccount;
        User creditAccount = creditAccountNumber == firstAccountNumber
                ? firstAccount
                : secondAccount;

        BigDecimal debitBefore = storedBalance(debitAccount);
        BigDecimal creditBefore = storedBalance(creditAccount);

        if (debitBefore.compareTo(transferAmount) < 0) {
            throw failure(BalanceErrorCode.INSUFFICIENT_FUNDS,
                    "The debit account does not have enough available balance");
        }

        BigDecimal debitAfter = debitBefore.subtract(transferAmount);
        BigDecimal creditAfter = creditBefore.add(transferAmount);
        double creditAsDouble = creditAfter.doubleValue();

        if (!Double.isFinite(creditAsDouble)) {
            throw failure(BalanceErrorCode.PROCESSING_ERROR,
                    "The resulting credit balance cannot be stored");
        }

        debitAccount.setBalance(debitAfter.doubleValue());
        creditAccount.setBalance(creditAsDouble);

        entityManager.flush();

        return new BalanceTransferResult(
                debitAccountNumber,
                debitAfter,
                creditAccountNumber,
                creditAfter,
                transferAmount
        );
    }

    private User findAndLock(long accountNumber) {
        User account = entityManager.find(
                User.class,
                accountNumber,
                LockModeType.PESSIMISTIC_WRITE
        );

        if (account == null) {
            throw failure(BalanceErrorCode.INVALID_ACCOUNT,
                    "Account " + accountNumber + " does not exist");
        }

        return account;
    }

    private void validateAccountNumbers(long debitAccountNumber,
                                        long creditAccountNumber) {
        if (debitAccountNumber <= 0 || creditAccountNumber <= 0) {
            throw failure(BalanceErrorCode.INVALID_ACCOUNT,
                    "Both account numbers must be positive");
        }
        if (debitAccountNumber == creditAccountNumber) {
            throw failure(BalanceErrorCode.INVALID_ACCOUNT,
                    "Debit and credit accounts must be different");
        }
    }

    private BigDecimal requireMoneyAmount(double amount) {
        if (!Double.isFinite(amount) || amount <= 0) {
            throw failure(BalanceErrorCode.INVALID_AMOUNT,
                    "Transfer amount must be a positive finite number");
        }

        try {
            return BigDecimal.valueOf(amount)
                    .setScale(MONEY_SCALE, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw failure(BalanceErrorCode.INVALID_AMOUNT,
                    "Transfer amount can have at most two decimal places");
        }
    }

    private BigDecimal storedBalance(User account) {
        double balance = account.getBalance();
        if (!Double.isFinite(balance)) {
            throw failure(BalanceErrorCode.PROCESSING_ERROR,
                    "Account " + account.getAccountNumber() + " has an invalid stored balance");
        }

        return BigDecimal.valueOf(balance).setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
    }

    private BalanceTransferException failure(BalanceErrorCode code, String message) {
        return new BalanceTransferException(code, message);
    }

    public record BalanceTransferResult(
            long debitAccountNumber,
            BigDecimal debitBalance,
            long creditAccountNumber,
            BigDecimal creditBalance,
            BigDecimal transferredAmount
    ) {
    }

    public enum BalanceErrorCode {
        INVALID_AMOUNT,
        INVALID_ACCOUNT,
        INSUFFICIENT_FUNDS,
        PROCESSING_ERROR
    }

    public static final class BalanceTransferException extends RuntimeException {
        private final BalanceErrorCode errorCode;

        public BalanceTransferException(BalanceErrorCode errorCode, String message) {
            super(message);
            this.errorCode = errorCode;
        }

        public BalanceErrorCode getErrorCode() {
            return errorCode;
        }
    }
}
