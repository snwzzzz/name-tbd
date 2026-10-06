package com.example.ntbd.Exception;

/** A version that can't be previewed or restored (saved before versions were snapshots): 409. */
public class VersionNotRestorableException extends RuntimeException {
    public VersionNotRestorableException(Long id) {
        super("Version " + id + " was saved in an old format and can't be opened");
    }
}
