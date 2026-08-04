package com.example.Atomic.Model;

import jakarta.persistence.*;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@Entity
public class Transactions {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trans_id")
    private long transID;
    @Column(name = "debit_account_number")
    private long debitAccountNumber;
    @Column(name = "credit_account_number")
    private long creditAccountNumber;
    @Column(name = "amount")
    private double amount;
    @Column(name = "time_date")
    private Instant timeDate;
    @Column(name = "status")
    private int status; // created - 1, validated - 2, sent - 3, completed - 4, failed - 5

    public Transactions() {}

    public Transactions(long debitAccountNumber, long creditAccountNumber,
                        double amount, Instant timeDate, int status) {
        //this.transID = transID;
        this.debitAccountNumber = debitAccountNumber;
        this.creditAccountNumber = creditAccountNumber;
        this.amount = amount;
        //this.date = date;
        this.timeDate = timeDate;
        this.status = status;
    }

    public long getTransID() {
        return transID;
    }

    public void setTransID(long transID) {
        this.transID = transID;
    }

    public long getDebitAccountNumber() {
        return debitAccountNumber;
    }

    public void setDebitAccountNumber(long debitAccountNumber) {
        this.debitAccountNumber = debitAccountNumber;
    }

    public long getCreditAccountNumber() {
        return creditAccountNumber;
    }

    public void setCreditAccountNumber(long creditAccountNumber) {
        this.creditAccountNumber = creditAccountNumber;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    //public String getDate() {
    //    return date;
   // }

   // public void setDate(String date) {
    //    this.date = date;
   // }

    public Instant getTimeDate() {
        return timeDate;
    }

    public void setTimeDate(Instant timeDate) {
        this.timeDate = timeDate;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }
}
