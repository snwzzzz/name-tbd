package com.example.ntbd.datasource.parsers;

import com.example.ntbd.datasource.ParsedTable;
import com.example.ntbd.datasource.TabularDataParser;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Comma-separated values (RFC 4180): the first record is the header, fields may be quoted with
 * double quotes ("" inside quotes is a literal quote), and records end with LF or CRLF.
 * Records with fewer fields than the header are padded with empty values.
 */
@Component
public class CsvParser implements TabularDataParser {

    private static final char SEPARATOR = ',';
    private static final char QUOTE = '"';
    private static final char BOM = '﻿';

    @Override
    public String format() {
        return "csv";
    }

    @Override
    public ParsedTable parse(String content) {
        List<List<String>> records = readRecords(content == null ? "" : content);
        if (records.isEmpty()) {
            throw new IllegalArgumentException("CSV is empty: a header row is required");
        }

        List<String> columns = columnNames(records.getFirst());
        List<List<String>> rows = new ArrayList<>();
        for (int i = 1; i < records.size(); i++) {
            List<String> record = records.get(i);
            if (record.size() > columns.size()) {
                throw new IllegalArgumentException("CSV row " + (i + 1) + " has " + record.size()
                        + " values, but the header has only " + columns.size() + " columns");
            }
            List<String> row = new ArrayList<>(record);
            row.addAll(Collections.nCopies(columns.size() - record.size(), ""));
            rows.add(row);
        }
        return new ParsedTable(columns, rows);
    }

    /** Header names, trimmed; blank ones get a generated name. */
    private static List<String> columnNames(List<String> header) {
        List<String> names = new ArrayList<>();
        for (int i = 0; i < header.size(); i++) {
            String name = header.get(i).trim();
            names.add(name.isEmpty() ? "Column " + (i + 1) : name);
        }
        return names;
    }

    /** Splits the content into records of fields, skipping blank (or whitespace-only) lines. */
    private static List<List<String>> readRecords(String content) {
        List<List<String>> records = new ArrayList<>();
        List<String> record = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;
        boolean fieldWasQuoted = false;

        int start = !content.isEmpty() && content.charAt(0) == BOM ? 1 : 0;
        for (int i = start; i < content.length(); i++) {
            char c = content.charAt(i);

            if (inQuotes) {
                if (c == QUOTE && i + 1 < content.length() && content.charAt(i + 1) == QUOTE) {
                    field.append(QUOTE);
                    i++;
                } else if (c == QUOTE) {
                    inQuotes = false;
                } else {
                    field.append(c);
                }
            } else if (c == QUOTE && field.isEmpty() && !fieldWasQuoted) {
                inQuotes = true;
                fieldWasQuoted = true;
            } else if (c == SEPARATOR) {
                record.add(field.toString());
                field.setLength(0);
                fieldWasQuoted = false;
            } else if (c == '\r' || c == '\n') {
                if (c == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') i++;
                endRecord(records, record, field, fieldWasQuoted);
                record = new ArrayList<>();
                field.setLength(0);
                fieldWasQuoted = false;
            } else {
                field.append(c);
            }
        }

        if (inQuotes) {
            throw new IllegalArgumentException("CSV has an unterminated quoted value");
        }
        endRecord(records, record, field, fieldWasQuoted);
        return records;
    }

    private static void endRecord(List<List<String>> records, List<String> record, StringBuilder field, boolean fieldWasQuoted) {
        boolean blankLine = record.isEmpty() && field.toString().isBlank() && !fieldWasQuoted;
        if (blankLine) return;
        record.add(field.toString());
        records.add(record);
    }
}
