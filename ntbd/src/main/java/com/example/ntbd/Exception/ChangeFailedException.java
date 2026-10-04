package com.example.ntbd.Exception;

/**
 * A change in a batch failed, so none of the batch was saved. Answered like {@code getCause()} would
 * be (404, 400, 403), plus which change it was ({@code index}).
 */
public class ChangeFailedException extends RuntimeException {

    private final int index;

    public ChangeFailedException(int index, String op, RuntimeException cause) {
        super("Change " + (index + 1) + " (" + op + "): " + cause.getMessage(), cause);
        this.index = index;
    }

    public int index() {
        return index;
    }
}
