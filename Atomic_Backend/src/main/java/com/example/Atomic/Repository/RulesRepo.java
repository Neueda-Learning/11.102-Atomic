package com.example.Atomic.Repository;

import com.example.Atomic.Model.Rules;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RulesRepo extends JpaRepository<Rules, Long> {
    List<Rules> findAllByAlertStatusEquals(int status);
    List<Rules> findAllByAlertSeverityEquals(int severity);
}
