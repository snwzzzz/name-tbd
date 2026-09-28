package com.example.ntbd.controller;

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

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final NodeService nodeService;
    private final EdgeService edgeService;
    private final FlowEngine flowEngine;

    // ---- Workflow endpoints ----

    @PostMapping
    public ResponseEntity<WorkflowDto> createWorkflow(@RequestBody NewWorkflowCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workflowService.createWorkflow(command));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkflowDto> getWorkflow(@PathVariable Long id) {
        return ResponseEntity.ok(workflowService.findById(id));
    }

    @GetMapping
    public ResponseEntity<List<WorkflowDto>> getWorkflowsByBranch(@RequestParam Long branchId) {
        return ResponseEntity.ok(workflowService.findByBranchId(branchId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkflow(@PathVariable Long id) {
        workflowService.deleteWorkflow(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/execute")
    public ResponseEntity<Void> executeWorkflow(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> initialContext) {
        flowEngine.executeWorkflow(id, initialContext != null ? initialContext : Map.of());
        return ResponseEntity.accepted().build();
    }

    // ---- Node endpoints ----

    @PostMapping("/{workflowId}/nodes")
    public ResponseEntity<NodeDto> createNode(
            @PathVariable Long workflowId,
            @RequestBody NewNodeCommand command) {
        // Merge workflowId from path into command
        var enriched = new NewNodeCommand(workflowId, command.type(), command.props(), command.x(), command.y());
        return ResponseEntity.status(HttpStatus.CREATED).body(nodeService.createNode(enriched));
    }

    @GetMapping("/{workflowId}/nodes")
    public ResponseEntity<List<NodeDto>> getNodes(@PathVariable Long workflowId) {
        return ResponseEntity.ok(nodeService.findByWorkflowId(workflowId));
    }

    @GetMapping("/{workflowId}/nodes/{nodeId}")
    public ResponseEntity<NodeDto> getNode(@PathVariable Long workflowId, @PathVariable Long nodeId) {
        return ResponseEntity.ok(nodeService.findById(nodeId));
    }

    @PutMapping("/{workflowId}/nodes/{nodeId}")
    public ResponseEntity<NodeDto> updateNode(
            @PathVariable Long workflowId,
            @PathVariable Long nodeId,
            @RequestBody com.example.ntbd.commands.UpdateNodeCommand command) {
        return ResponseEntity.ok(nodeService.updateNode(nodeId, command));
    }

    @DeleteMapping("/{workflowId}/nodes/{nodeId}")
    public ResponseEntity<Void> deleteNode(@PathVariable Long workflowId, @PathVariable Long nodeId) {
        nodeService.deleteNode(nodeId);
        return ResponseEntity.noContent().build();
    }

    // ---- Edge endpoints ----

    @PostMapping("/{workflowId}/edges")
    public ResponseEntity<EdgeDto> createEdge(
            @PathVariable Long workflowId,
            @RequestBody NewEdgeCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(edgeService.createEdge(command));
    }

    @GetMapping("/{workflowId}/edges/{edgeId}")
    public ResponseEntity<EdgeDto> getEdge(@PathVariable Long workflowId, @PathVariable Long edgeId) {
        return ResponseEntity.ok(edgeService.findById(edgeId));
    }

    @DeleteMapping("/{workflowId}/edges/{edgeId}")
    public ResponseEntity<Void> deleteEdge(@PathVariable Long workflowId, @PathVariable Long edgeId) {
        edgeService.deleteEdge(edgeId);
        return ResponseEntity.noContent().build();
    }
}
