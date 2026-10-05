package com.example.ntbd.export.definition;

import java.util.Arrays;

/** Where an exported app's data lives (chosen per app when exporting). */
public enum DataMode {
    /** The rows go into the file (only the columns the app uses); the app changes its own copy, in the browser. */
    EMBED("embed"),
    /** Rows are read and written through this server's data API; the last ones read are kept in the browser, and
     *  changes made while offline are queued and sent once back online. */
    LIVE_CACHED("live_cached"),
    /** Rows are read and written through this server's data API; nothing is kept in the browser. */
    LIVE("live");

    private final String id;

    DataMode(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }

    public boolean live() {
        return this != EMBED;
    }

    public static DataMode of(String id) {
        if (id == null || id.isBlank()) return EMBED;
        return Arrays.stream(values()).filter(m -> m.id.equals(id)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown data mode: " + id + " (embed, live_cached, live)"));
    }
}
