package com.example.ntbd.livedata.connector;

import java.util.List;

/** Rows as read; {@code truncated}: there were more than the source's maxRows. */
public record LiveRows(List<String> columns, List<LiveRow> rows, boolean truncated) {
}
