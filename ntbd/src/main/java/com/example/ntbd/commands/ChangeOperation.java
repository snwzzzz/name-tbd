package com.example.ntbd.commands;

import java.util.Map;

/**
 * One change in a batch (POST /api/branches/{id}/changes), applied in order. {@code op} says which:
 * <ul>
 *   <li>{@code createWidget}: {@code ref}, pageId, type, x/y/w/h, props, optional parentId|parentRef, workflowId</li>
 *   <li>{@code updateWidget}: id|ref, any of x/y/w/h, props (all of them), parentId|parentRef (-1 takes it out of its container)</li>
 *   <li>{@code deleteWidget}, {@code restoreWidget}: id|ref</li>
 *   <li>{@code createNode}: {@code ref}, workflowId, type, props, x/y</li>
 *   <li>{@code updateNode}: id|ref, any of props (all of them), x/y</li>
 *   <li>{@code deleteNode}, {@code restoreNode}: id|ref</li>
 *   <li>{@code createEdge}: {@code ref}, workflowId, sourceId|sourceRef, targetId|targetRef, sourcePort</li>
 *   <li>{@code deleteEdge}, {@code restoreEdge}: id|ref</li>
 * </ul>
 * A {@code ref} is the editor's temporary id for something it created: a create names the new thing with
 * it, and later changes in the same batch may point at it (as id, parent, edge end, or in a node's
 * widget settings). The answer maps each ref to the id it got.
 */
public record ChangeOperation(
        String op,
        Long id,
        String ref,
        Long pageId,
        Long workflowId,
        String type,
        Long parentId,
        String parentRef,
        Double x,
        Double y,
        Double w,
        Double h,
        Map<String, Object> props,
        Long sourceId,
        String sourceRef,
        Long targetId,
        String targetRef,
        String sourcePort
) {
}
