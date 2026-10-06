package com.example.ntbd.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Runs scheduled jobs (e.g. SoftDeletePurge). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
