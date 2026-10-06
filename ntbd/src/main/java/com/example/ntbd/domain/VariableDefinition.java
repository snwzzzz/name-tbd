package com.example.ntbd.domain;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * A variable of an app (stored on its branch) or of a page: its name in expressions, its type and
 * the value it starts with, as JSON (empty: the type's empty value). The editor's Variables panel
 * defines them; flows set them while the app runs (flow-engine/expressions/values.ts).
 */
public record VariableDefinition(String name, String type, String initial) {

    public static final Set<String> TYPES = Set.of("text", "number", "boolean", "list", "object");

    private static final Pattern NAME = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");
    /** Names expressions keep for themselves (CEL's words and the flows' own values). */
    private static final Set<String> RESERVED = Set.of(
            "true", "false", "null", "in", "as", "break", "const", "continue", "else", "for", "function", "if",
            "import", "let", "loop", "package", "namespace", "return", "var", "void", "while",
            "params", "data", "event", "item", "index", "response", "error", "row");

    /** Checks a list of definitions: valid, unique names and known types. */
    public static List<VariableDefinition> checked(List<VariableDefinition> variables) {
        if (variables == null) return List.of();
        Set<String> names = new HashSet<>();
        for (VariableDefinition v : variables) {
            if (v == null || v.name() == null || !NAME.matcher(v.name()).matches()) {
                throw new IllegalArgumentException("A variable name may only have letters, digits and _, and not start with a digit");
            }
            if (RESERVED.contains(v.name())) throw new IllegalArgumentException("\"" + v.name() + "\" can't name a variable");
            if (!names.add(v.name())) throw new IllegalArgumentException("Two variables are called \"" + v.name() + "\"");
            if (!TYPES.contains(v.type())) throw new IllegalArgumentException("Unknown variable type \"" + v.type() + "\"");
        }
        return List.copyOf(variables);
    }
}
