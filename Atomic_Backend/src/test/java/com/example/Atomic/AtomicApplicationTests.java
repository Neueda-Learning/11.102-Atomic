package com.example.Atomic;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AtomicApplicationTests {

    @Test
    void applicationClassHasExpectedBootstrapAnnotations() {
        assertTrue(AtomicApplication.class.isAnnotationPresent(SpringBootApplication.class));
        assertTrue(AtomicApplication.class.isAnnotationPresent(EnableScheduling.class));
    }
}
