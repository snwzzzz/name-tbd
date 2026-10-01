package com.example.ntbd.Exception;

/** The exported app's runtime isn't there (not built) or can't be used, so nothing can be exported. */
public class ExportRuntimeUnavailableException extends RuntimeException {

    public ExportRuntimeUnavailableException(String message) {
        super(message);
    }

    public ExportRuntimeUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
