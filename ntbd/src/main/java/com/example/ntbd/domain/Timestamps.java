package com.example.ntbd.domain;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Times are stored as UTC wall-clock times (timestamp columns have no zone) and leave the API as
 * {@link Instant}s ("...Z"), so every client shows them in its own time zone, whatever the server's is.
 */
public final class Timestamps {

    private Timestamps() {}

    /** Now, as stored. */
    public static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    /** An instant as stored. */
    public static LocalDateTime fromInstant(Instant instant) {
        return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    /** A stored time as the instant it is. */
    public static Instant toInstant(LocalDateTime storedUtc) {
        return storedUtc == null ? null : storedUtc.toInstant(ZoneOffset.UTC);
    }
}
