package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewEdgeCommand;
import com.example.ntbd.commands.NewNodeCommand;
import com.example.ntbd.commands.NewWorkflowCommand;
import com.example.ntbd.dto.EdgeDto;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.dto.WorkflowDto;
import com.example.ntbd.service.EdgeService;
import com.example.ntbd.service.NodeService;
import com.example.ntbd.service.WorkflowService;
import com.example.ntbd.workflow.FlowEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/workflows", produces = "application/json")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final NodeService nodeService;
    private final EdgeService edgeService;
    private final FlowEngine flowEngine;
    private final com.example.ntbd.workflow.sidecar.ServerFlowRunner serverFlowRunner;
    private final com.example.ntbd.service.SoftDeleteService softDelete;
    private final WorkspaceAccess access;

    // ---- Workflow endpoints ----

    @PostMapping
    public ResponseEntity<WorkflowDto> createWorkflow(@RequestBody NewWorkflowCommand command) {
        access.requireBranch(command.branchId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(workflowService.createWorkflow(command));
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<WorkflowDto> getWorkflow(@PathVariable Long id) {
        access.requireWorkflow(id, VIEWER);
        return ResponseEntity.ok(workflowService.findById(id));
    }

    @GetMapping(produces = "application/json")
    public ResponseEntity<List<WorkflowDto>> getWorkflowsByBranch(@RequestParam Long branchId) {
        access.requireBranch(branchId, VIEWER);
        return ResponseEntity.ok(workflowService.findByBranchId(branchId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkflow(@PathVariable Long id) {
        access.requireWorkflow(id, EDITOR);
        workflowService.deleteWorkflow(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/execute")
    public ResponseEntity<Void> executeWorkflow(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> initialContext) {
        access.requireWorkflow(id, EDITOR);
        flowEngine.executeWorkflow(id, initialContext != null ? initialContext : Map.of());
        return ResponseEntity.accepted().build();
    }

    /**
     * Runs the workflow on the server with the browser's engine (the flow sidecar): its flows that
     * start without a widget, with the body as {@code payload}. Answers the run log, the steps taken
     * and the variables after the run; rows the flow changed are saved. 503 without a sidecar.
     */
    @PostMapping(value = "/{id}/run", produces = "application/json")
    public ResponseEntity<Map<String, Object>> runWorkflow(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> payload) {
        access.requireWorkflow(id, EDITOR);
        return ResponseEntity.ok(serverFlowRunner.run(id, payload));
    }

    // ---- Node endpoints ----

    @PostMapping(value = "/{workflowId}/nodes", produces = "application/json")
    public ResponseEntity<NodeDto> createNode(
            @PathVariable Long workflowId,
            @RequestBody NewNodeCommand command) {
        access.requireWorkflow(workflowId, EDITOR);
        // Merge workflowId from path into command
        var enriched = new NewNodeCommand(workflowId, command.type(), command.props(), command.x(), command.y());
        return ResponseEntity.status(HttpStatus.CREATED).body(nodeService.createNode(enriched));
    }

    @GetMapping(value = "/{workflowId}/nodes", produces = "application/json")
    public ResponseEntity<List<NodeDto>> getNodes(@PathVariable Long workflowId) {
        access.requireWorkflow(workflowId, VIEWER);
        return ResponseEntity.ok(nodeService.findByWorkflowId(workflowId));
    }

    @GetMapping(value = "/{workflowId}/nodes/{nodeId}", produces = "application/json")
    public ResponseEntity<NodeDto> getNode(@PathVariable Long workflowId, @PathVariable Long nodeId) {
        access.requireNode(nodeId, VIEWER);
        return ResponseEntity.ok(nodeService.findById(nodeId));
    }

    @PutMapping("/{workflowId}/nodes/{nodeId}")
    public ResponseEntity<NodeDto> updateNode(
            @PathVariable Long workflowId,
            @PathVariable Long nodeId,
            @RequestBody com.example.ntbd.commands.UpdateNodeCommand command) {
        access.requireNode(nodeId, EDITOR);
        return ResponseEntity.ok(nodeService.updateNode(nodeId, command));
    }

    @DeleteMapping("/{workflowId}/nodes/{nodeId}")
    public ResponseEntity<Void> deleteNode(@PathVariable Long workflowId, @PathVariable Long nodeId) {
        access.requireNode(nodeId, EDITOR);
        softDelete.deleteNode(nodeId);
        return ResponseEntity.noContent().build();
    }

    /** Brings back a deleted node, with the edges deleted along with it. */
    @PostMapping("/{workflowId}/nodes/{nodeId}/restore")
    public ResponseEntity<Void> restoreNode(@PathVariable Long workflowId, @PathVariable Long nodeId) {
        access.requireNodeEvenIfDeleted(nodeId, EDITOR);
        softDelete.restoreNode(nodeId);
        return ResponseEntity.noContent().build();
    }

    // ---- Edge endpoints ----

    @PostMapping(value = "/{workflowId}/edges", produces = "application/json")
    public ResponseEntity<EdgeDto> createEdge(
            @PathVariable Long workflowId,
            @RequestBody NewEdgeCommand command) {
        access.requireWorkflow(workflowId, EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(edgeService.createEdge(workflowId, command));
    }

    @GetMapping(value = "/{workflowId}/edges", produces = "application/json")
    public ResponseEntity<List<EdgeDto>> getEdges(@PathVariable Long workflowId) {
        access.requireWorkflow(workflowId, VIEWER);
        return ResponseEntity.ok(edgeService.findByWorkflowId(workflowId));
    }

    @GetMapping(value = "/{workflowId}/edges/{edgeId}", produces = "application/json")
    public ResponseEntity<EdgeDto> getEdge(@PathVariable Long workflowId, @PathVariable Long edgeId) {
        access.requireEdge(edgeId, VIEWER);
        return ResponseEntity.ok(edgeService.findById(edgeId));
    }

    @DeleteMapping("/{workflowId}/edges/{edgeId}")
    public ResponseEntity<Void> deleteEdge(@PathVariable Long workflowId, @PathVariable Long edgeId) {
        access.requireEdge(edgeId, EDITOR);
        softDelete.deleteEdge(edgeId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{workflowId}/edges/{edgeId}/restore")
    public ResponseEntity<Void> restoreEdge(@PathVariable Long workflowId, @PathVariable Long edgeId) {
        access.requireEdgeEvenIfDeleted(edgeId, EDITOR);
        softDelete.restoreEdge(edgeId);
        return ResponseEntity.noContent().build();
    }
}
