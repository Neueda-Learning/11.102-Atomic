package com.example.Atomic.Repository;

import com.example.Atomic.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface UserRepo extends JpaRepository<User, Long> {
    boolean existsByEmailIgnoreCase(String email);
    User findByEmailIgnoreCase(String email);
    User findByAccountNumber(long debitAccountNumber);
}
