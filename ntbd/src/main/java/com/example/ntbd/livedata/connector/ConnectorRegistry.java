package com.example.ntbd.livedata.connector;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/** The connectors by the kind of connection they serve. */
@Component
public class ConnectorRegistry {

    private final Map<String, DataConnector> byKind = new HashMap<>();

    public ConnectorRegistry(List<DataConnector> connectors) {
        for (DataConnector connector : connectors) {
            for (String kind : connector.kinds()) {
                if (byKind.put(kind, connector) != null) {
                    throw new IllegalStateException("Two connectors serve \"" + kind + "\"");
                }
            }
        }
    }

    public DataConnector get(String kind) {
        DataConnector connector = byKind.get(kind);
        if (connector == null) {
            throw new IllegalArgumentException("Unknown kind of connection: " + kind + " (known: " + kinds() + ")");
        }
        return connector;
    }

    public Set<String> kinds() {
        return new TreeSet<>(byKind.keySet());
    }
}
