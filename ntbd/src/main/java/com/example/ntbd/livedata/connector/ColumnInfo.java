package com.example.ntbd.livedata.connector;

/**
 * A column as its system describes it. {@code type} is one of text, number, boolean, date (values travel as
 * text either way; the type is for forms and for writing values back correctly).
 */
public record ColumnInfo(String name, String type) {

    public static ColumnInfo text(String name) {
        return new ColumnInfo(name, "text");
    }
}
