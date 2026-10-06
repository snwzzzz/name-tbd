package com.example.ntbd.livedata.connector;

/**
 * A connection as connectors get it: its settings and its decrypted secret (password, tokens). Lives
 * only in memory while a request is served.
 *
 * @param id null for a connection being tried out before it's saved
 */
public record ConnectionRef(Long id, String kind, Settings settings, Settings secret) {

    @Override
    public String toString() {
        // Never the secret, even in logs
        return "ConnectionRef[id=" + id + ", kind=" + kind + "]";
    }
}
