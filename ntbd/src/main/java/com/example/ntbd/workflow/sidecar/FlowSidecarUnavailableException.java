package com.example.ntbd.workflow.sidecar;

/** Flows can't run on the server: no sidecar is configured, or it can't be reached (503). */
public class FlowSidecarUnavailableException extends RuntimeException {

    public FlowSidecarUnavailableException(String message) {
        super(message);
    }

    public FlowSidecarUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
