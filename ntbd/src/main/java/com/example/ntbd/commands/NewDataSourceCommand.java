package com.example.ntbd.commands;

/** Imports tabular data: {@code content} is the raw text, read as {@code format} (e.g. "csv"). */
public record NewDataSourceCommand(
        Long branchId,
        String name,
        String format,
        String content
) {
}
