package com.example.ntbd.Exception;

/** A row that isn't (or is no longer) in its data source, e.g. deleted by someone else meanwhile. */
public class RowNotFoundException extends ResourceNotFoundException {
    public RowNotFoundException(String rowId) {
        super("There is no row " + rowId + " (it may have been deleted)");
    }
}
