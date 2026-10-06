package com.example.ntbd.service;

import com.example.ntbd.Exception.*;
import com.example.ntbd.catalog.IdReferences;
import com.example.ntbd.commands.*;
import com.example.ntbd.dto.ChangeBatchResultDto;
import com.example.ntbd.persistence.BranchOwnershipRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Applies a batch of changes to one branch in one transaction: all of them, or (when one fails) none.
 * The editor saves this way, a few times a minute, instead of one request per change.
 * <p>
 * Everything a change points at must be in the branch, else it counts as not found (404), like any
 * other workspace's data. Things created in the batch are named by the editor's {@code ref}; later
 * changes may point at them by it, also inside a node's widget settings (shared/id-references.json).
 * The services do the work, with their usual checks (a parent on the same page, an edge's nodes in its
 * workflow, a node's settings valid).
 */
@RequiredArgsConstructor
@Service
public class ChangeBatchService {

    static final int MAX_CHANGES = 1000;

    private final BranchOwnershipRepository ownership;
    private final UiComponentService widgets;
    private final NodeService nodes;
    private final EdgeService edges;
    private final SoftDeleteService softDelete;
    private final IdReferences references;

    @Transactional
    public ChangeBatchResultDto apply(Long branchId, ChangeBatchCommand command) {
        List<ChangeOperation> changes = command == null || command.changes() == null ? List.of() : command.changes();
        if (changes.size() > MAX_CHANGES) {
            throw new IllegalArgumentException("At most " + MAX_CHANGES + " changes per batch");
        }
        Batch batch = new Batch(branchId);
        for (int i = 0; i < changes.size(); i++) {
            ChangeOperation change = changes.get(i);
            try {
                apply(batch, change);
            } catch (ResourceNotFoundException | IllegalArgumentException | ForbiddenException e) {
                throw new ChangeFailedException(i, change.op(), e);
            }
        }
        return new ChangeBatchResultDto(batch.refs);
    }

    /** The branch being changed, and the ids of what the batch created so far, by ref. */
    private static final class Batch {
        final Long branchId;
        final Map<String, Long> refs = new LinkedHashMap<>();

        Batch(Long branchId) {
            this.branchId = branchId;
        }
    }

    private void apply(Batch batch, ChangeOperation c) {
        if (c.op() == null) throw new IllegalArgumentException("A change needs an op");
        switch (c.op()) {
            case "createWidget" -> {
                requireIn(batch, c.pageId(), ownership::branchOfPage, "page");
                if (c.workflowId() != null) requireIn(batch, c.workflowId(), ownership::branchOfWorkflow, "workflow");
                Long parentId = optionalWidget(batch, c.parentId(), c.parentRef());
                var created = widgets.createComponent(new NewUiComponentCommand(c.pageId(), c.type(), c.props(),
                        c.workflowId(), parentId, c.x(), c.y(), c.w(), c.h()));
                remember(batch, c.ref(), created.id());
            }
            case "updateWidget" -> {
                Long id = widget(batch, c.id(), c.ref());
                Long parentId = c.parentId() != null && c.parentId() == -1L ? Long.valueOf(-1L) : optionalWidget(batch, c.parentId(), c.parentRef());
                widgets.updateComponent(id, new UpdateUiComponentCommand(c.props(), parentId, c.x(), c.y(), c.w(), c.h()));
            }
            case "deleteWidget" -> softDelete.deleteWidget(widget(batch, c.id(), c.ref()));
            case "restoreWidget" -> softDelete.restoreWidget(
                    resolve(batch, c.id(), c.ref(), ownership::branchOfWidgetEvenIfDeleted, "widget"));
            case "createNode" -> {
                requireIn(batch, c.workflowId(), ownership::branchOfWorkflow, "workflow");
                var created = nodes.createNode(new NewNodeCommand(c.workflowId(), c.type(), withRefs(batch, c.props()), c.x(), c.y()));
                remember(batch, c.ref(), created.id());
            }
            case "updateNode" -> nodes.updateNode(node(batch, c.id(), c.ref()),
                    new UpdateNodeCommand(withRefs(batch, c.props()), c.x(), c.y()));
            case "deleteNode" -> softDelete.deleteNode(node(batch, c.id(), c.ref()));
            case "restoreNode" -> softDelete.restoreNode(
                    resolve(batch, c.id(), c.ref(), ownership::branchOfNodeEvenIfDeleted, "node"));
            case "createEdge" -> {
                requireIn(batch, c.workflowId(), ownership::branchOfWorkflow, "workflow");
                var created = edges.createEdge(c.workflowId(),
                        new NewEdgeCommand(node(batch, c.sourceId(), c.sourceRef()), node(batch, c.targetId(), c.targetRef()), c.sourcePort()));
                remember(batch, c.ref(), created.id());
            }
            case "deleteEdge" -> softDelete.deleteEdge(
                    resolve(batch, c.id(), c.ref(), ownership::branchOfEdge, "edge"));
            case "restoreEdge" -> softDelete.restoreEdge(
                    resolve(batch, c.id(), c.ref(), ownership::branchOfEdgeEvenIfDeleted, "edge"));
            default -> throw new IllegalArgumentException("Unknown change: " + c.op());
        }
    }

    // ---- Resolving what a change points at ----

    private Long widget(Batch batch, Long id, String ref) {
        return resolve(batch, id, ref, ownership::branchOfWidget, "widget");
    }

    private Long optionalWidget(Batch batch, Long id, String ref) {
        return id == null && ref == null ? null : widget(batch, id, ref);
    }

    private Long node(Batch batch, Long id, String ref) {
        return resolve(batch, id, ref, ownership::branchOfNode, "node");
    }

    /** The id for {@code ref} (made earlier in the batch) or {@code id}, which must be of the batch's branch. */
    private Long resolve(Batch batch, Long id, String ref, Function<Long, Optional<Long>> branchOf, String what) {
        if (ref != null && batch.refs.containsKey(ref)) return batch.refs.get(ref);
        if (id == null) {
            throw new IllegalArgumentException(ref != null
                    ? "No " + what + " was created as '" + ref + "' earlier in this batch"
                    : "The change names no " + what);
        }
        return requireIn(batch, id, branchOf, what);
    }

    private Long requireIn(Batch batch, Long id, Function<Long, Optional<Long>> branchOf, String what) {
        if (id == null) throw new IllegalArgumentException("The change names no " + what);
        if (!branchOf.apply(id).map(batch.branchId::equals).orElse(false)) {
            throw new ResourceNotFoundException("No " + what + " " + id + " in this branch");
        }
        return id;
    }

    private static void remember(Batch batch, String ref, Long id) {
        if (ref == null || ref.isBlank()) throw new IllegalArgumentException("A create needs a ref");
        if (batch.refs.putIfAbsent(ref, id) != null) {
            throw new IllegalArgumentException("Ref '" + ref + "' is used twice in this batch");
        }
    }

    /** A node's props with refs to things made in this batch replaced by their ids (top level and in config). */
    private Map<String, Object> withRefs(Batch batch, Map<String, Object> props) {
        if (props == null || batch.refs.isEmpty()) return props;
        Map<String, Object> result = replaceRefs(batch, props);
        if (result.get("config") instanceof Map<?, ?> config) {
            @SuppressWarnings("unchecked")
            Map<String, Object> typed = (Map<String, Object>) config;
            result.put("config", replaceRefs(batch, typed));
        }
        return result;
    }

    private Map<String, Object> replaceRefs(Batch batch, Map<String, Object> values) {
        Map<String, Object> result = new HashMap<>(values);
        result.replaceAll((key, value) -> value instanceof String ref
                && references.ofNodeKey(key).isPresent() && batch.refs.containsKey(ref)
                ? String.valueOf(batch.refs.get(ref))
                : value);
        return result;
    }
}
