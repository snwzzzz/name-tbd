package com.example.ntbd.datasource;

/**
 * Reads one text format (CSV, ...) into a {@link ParsedTable}. Support for another format is added
 * by registering another implementation as a bean; {@link TabularDataParserRegistry} picks it up.
 */
public interface TabularDataParser {

    /**
     * Returns the format this parser reads, e.g. "csv".
     * Used by {@link TabularDataParserRegistry} to key parsers by format.
     */
    String format();

    /**
     * Parses the given content.
     *
     * @throws IllegalArgumentException if the content is not valid for this format
     */
    ParsedTable parse(String content);
}
