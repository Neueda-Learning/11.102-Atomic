package com.example.Atomic.Repository;

import com.example.Atomic.Model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepo extends JpaRepository<Alert, Long> {
    List<Alert> findAllByStatusEquals(int status);

    List<Alert> findAllByAlertIDEquals(long ruleId);

    List<Alert> findAllByAccountNumber(long accountId);

    List<Alert> findAllByAccountNumberAndStatusEquals(long accountId, int status);

    List<Alert> findAllByAccountNumberAndAlertIDEquals(long accountId, long ruleId);
}
