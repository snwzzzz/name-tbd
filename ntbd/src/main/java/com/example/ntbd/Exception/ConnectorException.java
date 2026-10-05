package com.example.ntbd.Exception;

/**
 * The customer's system (database, spreadsheet, API) refused or failed a request (502). The message is
 * meant for the app builder, so it says what went wrong there without secrets.
 */
public class ConnectorException extends RuntimeException {
    public ConnectorException(String message) {
        super(message);
    }

    public ConnectorException(String message, Throwable cause) {
        super(message, cause);
    }
}
