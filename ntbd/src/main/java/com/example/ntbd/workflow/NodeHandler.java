package com.example.ntbd.workflow;

import com.example.ntbd.domain.Node;

public interface NodeHandler {

    /**
     * Returns the node type string this handler is responsible for.
     * Used by {@link NodeHandlerRegistry} to key handlers by type.
     */
    String nodeType();

    /**
     * Executes the node's logic against the given context.
     *
     * @param node    the node to execute, including its props
     * @param context the mutable flow context carrying cross-node state
     * @return an {@link ExecutionResult} containing the outgoing port name and any output data
     */
    ExecutionResult handle(Node node, FlowContext context);
}
