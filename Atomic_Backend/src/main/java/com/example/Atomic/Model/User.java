package com.example.Atomic.Model;

import jakarta.persistence.*;
//import org.hibernate.annotations.GenericGenerator;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@Entity
public class User {
    @Id
    //@GeneratedValue(generator = "account_gen")
    //@GenericGenerator(name = "account_gen", type = EightDigitSequenceGenerator.class)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_number")
    private long accountNumber;
    @Column(name = "account_balance")
    private double balance;
    @Column(name = "first_name")
    private String firstName;
    @Column(name = "last_name")
    private String lastName;
    @Column(name = "email_id")
    private String email;
    @Column(name = "password")
    private String password;
    @Column(name = "time_created")
    private Instant timeCreated;

    public User() {}

    public User(double balance, String firstName, String lastName, String email, String password) {
        //this.accountNumber = accountNumber;
        this.balance = balance;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.timeCreated = Instant.now();
    }

    public long getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(long accountNumber) {
        this.accountNumber = accountNumber;
    }

    public double getBalance() {
        return balance;
    }

    public void setBalance(double balance) {
        this.balance = balance;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Instant getTimeCreated() {
        return timeCreated;
    }

    public void setTimeCreated(Instant timeCreated) {
        this.timeCreated = timeCreated;
    }
}
