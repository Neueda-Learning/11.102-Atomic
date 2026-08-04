package com.example.Atomic.Model;

public class Transaction {
    private long trans_id;
    private long debit_account_number;
    private long credit_account_number;
    private double amount;
    private String date;
    private String timestamp;
    private int status;

    Transaction(long trans_id, long debit_account_number, long credit_account_number,
                double amount, String date, String timestamp, int status) {
        this.trans_id = trans_id;
        this.debit_account_number = debit_account_number;
        this.credit_account_number = credit_account_number;
        this.amount = amount;
        this.date = date;
        this.timestamp = timestamp;
        this.status = status;
    }

    public long getTrans_id() {
        return trans_id;
    }

    public void setTrans_id(long trans_id) {
        this.trans_id = trans_id;
    }

    public long getDebit_account_number() {
        return debit_account_number;
    }

    public void setDebit_account_number(long debit_account_number) {
        this.debit_account_number = debit_account_number;
    }

    public long getCredit_account_number() {
        return credit_account_number;
    }

    public void setCredit_account_number(long credit_account_number) {
        this.credit_account_number = credit_account_number;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }
}
