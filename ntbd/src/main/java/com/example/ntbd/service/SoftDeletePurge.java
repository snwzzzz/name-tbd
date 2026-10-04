package com.example.ntbd.service;

import com.example.ntbd.domain.Timestamps;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Removes deleted rows for good once they're older than {@code app.soft-delete.retention} (default a day). */
@RequiredArgsConstructor
@Component
public class SoftDeletePurge {

    private static final Logger log = LoggerFactory.getLogger(SoftDeletePurge.class);

    private final SoftDeleteService softDelete;

    @Value("${app.soft-delete.retention:P1D}")
    private Duration retention;

    @Scheduled(initialDelayString = "PT5M", fixedDelayString = "PT1H")
    public void purge() {
        int removed = softDelete.purgeDeletedBefore(Timestamps.nowUtc().minus(retention));
        if (removed > 0) log.info("Removed {} deleted rows for good", removed);
    }
}
