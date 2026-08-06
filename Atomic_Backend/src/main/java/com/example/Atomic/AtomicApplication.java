package com.example.Atomic;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class AtomicApplication {

	public static void main(String[] args) {
		SpringApplication.run(AtomicApplication.class, args);
	}

}
