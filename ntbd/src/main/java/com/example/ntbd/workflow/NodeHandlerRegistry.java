package com.example.ntbd.workflow;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class NodeHandlerRegistry {

    private final Map<String, NodeHandler> handlers;

    public NodeHandlerRegistry(List<NodeHandler> handlerList) {
        this.handlers = handlerList.stream()
                .collect(Collectors.toMap(NodeHandler::nodeType, handler -> handler));
    }

    public NodeHandler getHandler(String type) {
        NodeHandler handler = handlers.get(type);
        if (handler == null) {
            throw new IllegalArgumentException("No handler found for node type: " + type);
        }
        return handler;
    }
}
