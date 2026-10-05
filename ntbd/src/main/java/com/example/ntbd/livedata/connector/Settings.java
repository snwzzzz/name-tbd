package com.example.ntbd.livedata.connector;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A connection's or data source's settings (parsed JSON), with typed reads. */
public record Settings(Map<String, Object> values) {

    public static final Settings EMPTY = new Settings(Map.of());

    public Settings {
        values = values == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }

    /** The text at {@code key}; null when missing or blank. */
    public String text(String key) {
        Object value = values.get(key);
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    public String text(String key, String fallback) {
        String text = text(key);
        return text != null ? text : fallback;
    }

    /** The text at {@code key}, or a 400 naming the setting. */
    public String require(String key, String label) {
        String text = text(key);
        if (text == null) throw new IllegalArgumentException(label + " is required");
        return text;
    }

    public int integer(String key, int fallback) {
        Object value = values.get(key);
        if (value instanceof Number number) return number.intValue();
        String text = text(key);
        if (text == null) return fallback;
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Setting " + key + " must be a whole number");
        }
    }

    public boolean bool(String key, boolean fallback) {
        Object value = values.get(key);
        if (value instanceof Boolean b) return b;
        String text = text(key);
        return text == null ? fallback : Boolean.parseBoolean(text);
    }

    /** A JSON object at {@code key} as text values (e.g. extra headers); empty when missing. */
    public Map<String, String> map(String key) {
        Object value = values.get(key);
        if (!(value instanceof Map<?, ?> map)) return Map.of();
        Map<String, String> result = new LinkedHashMap<>();
        map.forEach((k, v) -> {
            if (v != null) result.put(String.valueOf(k), String.valueOf(v));
        });
        return result;
    }

    public List<String> list(String key) {
        Object value = values.get(key);
        if (!(value instanceof List<?> list)) return List.of();
        return list.stream().map(String::valueOf).toList();
    }

    public Settings with(String key, Object value) {
        Map<String, Object> copy = new LinkedHashMap<>(values);
        copy.put(key, value);
        return new Settings(copy);
    }
}
