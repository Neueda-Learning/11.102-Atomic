package com.example.Atomic.Model;

public class Alert {
    // Alert ID, Severity, Status --> Opened, Acknowledged, etc; Alert Date, Alert Time, Alert Resolution Time
    private long alert_id;
    private int severity;
    private int status;
    private String alert_date;
    private String alert_time;
    private long resolution_time;

    Alert(long alert_id, int severity, int status, String alert_date, String alert_time,
          long resolution_time) {
        this.alert_id = alert_id;
        this.severity = severity;
        this.status = status;
        this.alert_date = alert_date;
        this.alert_time = alert_time;
        this.resolution_time = resolution_time;
    }

    public long getAlert_id() {
        return alert_id;
    }

    public void setAlert_id(long alert_id) {
        this.alert_id = alert_id;
    }

    public int getSeverity() {
        return severity;
    }

    public void setSeverity(int severity) {
        this.severity = severity;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getAlert_date() {
        return alert_date;
    }

    public void setAlert_date(String alert_date) {
        this.alert_date = alert_date;
    }

    public String getAlert_time() {
        return alert_time;
    }

    public void setAlert_time(String alert_time) {
        this.alert_time = alert_time;
    }

    public long getResolution_time() {
        return resolution_time;
    }

    public void setResolution_time(long resolution_time) {
        this.resolution_time = resolution_time;
    }
}