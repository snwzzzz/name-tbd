package com.example.ntbd.export;

import java.util.Map;

/** Helpers for turning widget props into safe HTML. */
public final class WidgetHtml {

    private WidgetHtml() {}

    public static String prop(Map<String, Object> props, String key) {
        Object v = props.get(key);
        return v != null ? v.toString() : null;
    }

    public static String prop(Map<String, Object> props, String key, String fallback) {
        String v = prop(props, key);
        return v != null && !v.isEmpty() ? v : fallback;
    }

    /** A boolean prop; stored props are text, so "true" counts as true. */
    public static boolean boolProp(Map<String, Object> props, String key, boolean fallback) {
        String v = prop(props, key);
        return v == null || v.isBlank() ? fallback : Boolean.parseBoolean(v.trim());
    }

    /** A whole-number prop, or the fallback when it isn't one. */
    public static int intProp(Map<String, Object> props, String key, int fallback) {
        String v = prop(props, key);
        if (v == null) return fallback;
        try {
            // Numbers may come back as "10.0"
            return (int) Double.parseDouble(v.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    /** Only plain color values may end up in a style attribute. */
    public static String cssColor(String value, String fallback) {
        if (value == null) return fallback;
        String v = value.trim();
        return v.matches("#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|hsl)a?\\([0-9.,%\\s]+\\)") ? v : fallback;
    }

    public static String escapeHtml(String s) {
        if (s == null) return "";
        StringBuilder out = new StringBuilder(s.length());
        for (char ch : s.toCharArray()) {
            switch (ch) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(ch);
            }
        }
        return out.toString();
    }
}
