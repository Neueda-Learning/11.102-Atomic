package com.example.Atomic.Repository;

import com.example.Atomic.Model.Transactions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TransactionsRepo extends JpaRepository<Transactions, Long> {

    // Transactions findAllByTimestampBetween(Instant timestampAfter, Instant timestampBefore);

    List<Transactions> findAllByCreditAccountNumberEquals(long accountNumber);

    List<Transactions> findAllByDebitAccountNumberEquals(long accountNumber);

    List<Transactions> findAllByAmountBetween(double amountAfter, double amountBefore);

    List<Transactions> findAllByTimeDateBetween(Instant i1, Instant i2);

    @Query("""
            SELECT t FROM Transactions t
            WHERE t.status = 1 AND t.timeDate <= :now
            ORDER BY t.timeDate ASC, t.transID ASC
            """)
    List<Transactions> findDueTransactions(@Param("now") Instant now);
}
