package com.example.Atomic.Model;

import jakarta.persistence.*;
import jdk.jfr.DataAmount;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@Entity
public class Alert {
    // Alert ID, Severity, Status --> Opened, Acknowledged, etc; Alert Time, Resolution Time
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_gen_id")
    private long alertGenID;
    @Column(name = "alert_id")
    private long alertID;
    //@Column(name = "severity")
    //private int severity;
    @Column(name = "status")
    private int status;
    @Column(name = "alert_time")
    private Instant alertTime;
    //private String alert_date;
    @Column(name = "resolution_time")
    private Instant resolutionTime;

    public Alert() {}

    public Alert(long alertID, int status, Instant alert_time,
          Instant resolution_time) {
        this.alertID = alertID;
        //this.severity = severity;
        this.status = status;
        //this.alert_date = alert_date;
        this.alertTime = alert_time;
        this.resolutionTime = resolution_time;
    }

    public long getAlert_id() {
        return alertID;
    }

    public void setAlert_id(long alert_id) {
        this.alertID = alert_id;
    }

    //public int getSeverity() {
    //    return severity;
    //}

   // public void setSeverity(int severity) {
    //    this.severity = severity;
   // }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    //public String getAlert_date() {
        //return alert_date;
   // }

    //public void setAlert_date(String alert_date) {
    //    this.alert_date = alert_date;
    //}

    public Instant getAlert_time() {
        return alertTime;
    }

    public void setAlert_time(Instant alert_time) {
        this.alertTime = alert_time;
    }

    public Instant getResolution_time() {
        return resolutionTime;
    }

    public void setResolution_time(Instant resolution_time) {
        this.resolutionTime = resolution_time;
    }
}