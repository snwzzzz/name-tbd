package com.example.ntbd;

import org.springframework.boot.SpringApplication;

public class TestNtbdApplication {

    public static void main(String[] args) {
        SpringApplication.from(NtbdApplication::main).with(PostgresTestcontainersConfiguration.class).run(args);
    }
}
