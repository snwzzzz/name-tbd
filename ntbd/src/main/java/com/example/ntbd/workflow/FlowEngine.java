package com.example.ntbd.workflow;

import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.persistence.EdgeRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FlowEngine {

    private final WorkflowRepository workflowRepository;
    private final EdgeRepository edgeRepository;
    private final NodeHandlerRegistry registry;

    @Transactional
    public void executeWorkflow(Long workflowId, Map<String, Object> initialContext) {
        Workflow workflow = workflowRepository.findById(new Workflow.WorkflowId(workflowId))
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

        if (workflow.getStatus() != WorkflowStatus.ACTIVE) {
            log.warn("Attempting to execute non-active workflow: {}", workflowId);
            return;
        }

        workflow.setStatus(WorkflowStatus.RUNNING);
        workflowRepository.saveAndFlush(workflow);

        try {
            FlowContext context = new FlowContext(initialContext);
            List<Node> nodes = workflow.getNodes();
            List<Edge> edges = edgeRepository.findBySourceNode_Workflow_Id(workflow.getId());

            Optional<Node> startNodeOpt = findStartNode(nodes, edges);
            if (startNodeOpt.isEmpty()) {
                log.warn("No start node found for workflow: {}", workflowId);
                markWorkflowStatus(workflow, WorkflowStatus.COMPLETED);
                return;
            }

            Node currentNode = startNodeOpt.get();
            while (currentNode != null) {
                NodeHandler handler = registry.getHandler(currentNode.getType());
                ExecutionResult result = handler.handle(currentNode, context);

                if (result.outputData() != null) {
                    context.putAll(result.outputData());
                }

                if (!result.success()) {
                    log.error("Node execution failed for node {} in workflow {}: {}", currentNode.getId(), workflowId, result.errorMessage());
                    markWorkflowStatus(workflow, WorkflowStatus.FAILED);
                    return;
                }

                String outputPort = result.outputPort();
                currentNode = findNextNode(currentNode, outputPort, nodes, edges);
            }

            markWorkflowStatus(workflow, WorkflowStatus.COMPLETED);
        } catch (Exception e) {
            log.error("Unhandled exception during workflow execution for workflow {}", workflowId, e);
            markWorkflowStatus(workflow, WorkflowStatus.FAILED);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markWorkflowStatus(Workflow workflow, WorkflowStatus status) {
        workflow.setStatus(status);
        workflowRepository.save(workflow);
    }

    private Optional<Node> findStartNode(List<Node> nodes, List<Edge> edges) {
        // Start node is a node that has no incoming edges
        return nodes.stream()
                .filter(node -> edges.stream().noneMatch(edge -> edge.getTargetNode().getId().equals(node.getId())))
                .findFirst();
    }

    private Node findNextNode(Node currentNode, String outputPort, List<Node> nodes, List<Edge> edges) {
        if (outputPort == null) return null;

        return edges.stream()
                .filter(edge -> edge.getSourceNode().getId().equals(currentNode.getId()) && outputPort.equals(edge.getSourcePort()))
                .map(Edge::getTargetNode)
                .findFirst()
                .orElse(null);
    }
}
