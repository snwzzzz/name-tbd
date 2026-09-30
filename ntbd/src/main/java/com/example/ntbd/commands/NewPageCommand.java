package com.example.ntbd.commands;

/** Creates a page; with {@code layout} true, the branch's layout page (there can be only one). */
public record NewPageCommand(
        String name,
        String path,
        Long branchId,
        Boolean layout
) {
    /** A regular (non-layout) page. */
    public NewPageCommand(String name, String path, Long branchId) {
        this(name, path, branchId, false);
    }
}
