package com.example.ntbd.datasource;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class TabularDataParserRegistry {

    private final Map<String, TabularDataParser> parsers;

    public TabularDataParserRegistry(List<TabularDataParser> parserList) {
        this.parsers = parserList.stream()
                .collect(Collectors.toMap(parser -> normalize(parser.format()), parser -> parser));
    }

    public TabularDataParser getParser(String format) {
        TabularDataParser parser = format == null ? null : parsers.get(normalize(format));
        if (parser == null) {
            throw new IllegalArgumentException("No parser found for data format: " + format);
        }
        return parser;
    }

    private static String normalize(String format) {
        return format.trim().toLowerCase(Locale.ROOT);
    }
}
