package com.example.Atomic.Service;

import org.springframework.stereotype.Component;

@Component
public class AlertProcessing {
    public String getAlert() {
        // Implement alert retrieval logic here
        return "Alert message";
    }
    public String updateAlertStatus() {
        // Implement alert status update logic here
        return "Alert status updated successfully!";
    }
}
