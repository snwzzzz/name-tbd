package com.example.ntbd.workflow;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class FlowContext {

    private final Map<String, Object> variables;

    public FlowContext() {
        this.variables = new HashMap<>();
    }

    public FlowContext(Map<String, Object> initialVariables) {
        this.variables = new HashMap<>(initialVariables);
    }

    public Object get(String key) {
        return variables.get(key);
    }

    public void put(String key, Object value) {
        variables.put(key, value);
    }

    public void putAll(Map<String, Object> data) {
        variables.putAll(data);
    }

    public Map<String, Object> getAll() {
        return Collections.unmodifiableMap(variables);
    }
}
