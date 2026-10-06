package com.example.ntbd.service;

import com.example.ntbd.Exception.EdgeNotFoundException;
import com.example.ntbd.Exception.NodeNotFoundException;
import com.example.ntbd.commands.NewEdgeCommand;
import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.dto.EdgeDto;
import com.example.ntbd.mapper.EdgeMapper;
import com.example.ntbd.persistence.EdgeRepository;
import com.example.ntbd.persistence.NodeRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class EdgeService {

    private final EdgeRepository edgeRepository;
    private final NodeRepository nodeRepository;

    @Transactional
    /** An edge between two nodes of workflow {@code workflowId} (a node of another workflow counts as not found). */
    public EdgeDto createEdge(Long workflowId, NewEdgeCommand command) {
        Node sourceNode = nodeRepository.findById(new Node.NodeId(command.sourceNodeId()))
                .filter(node -> inWorkflow(node, workflowId))
                .orElseThrow(() -> new NodeNotFoundException(command.sourceNodeId()));

        Node targetNode = nodeRepository.findById(new Node.NodeId(command.targetNodeId()))
                .filter(node -> inWorkflow(node, workflowId))
                .orElseThrow(() -> new NodeNotFoundException(command.targetNodeId()));

        Edge edge = Edge.builder()
                .sourceNode(sourceNode)
                .targetNode(targetNode)
                .sourcePort(command.sourcePort())
                .build();

        return EdgeMapper.toDto(edgeRepository.saveAndFlush(edge));
    }

    @Transactional
    public EdgeDto findById(Long id) {
        return edgeRepository.findById(new Edge.EdgeId(id))
                .map(EdgeMapper::toDto)
                .orElseThrow(() -> new EdgeNotFoundException(id));
    }

    @Transactional
    public List<EdgeDto> findByWorkflowId(Long workflowId) {
        return edgeRepository.findBySourceNode_Workflow_Id(new Workflow.WorkflowId(workflowId)).stream()
                .map(EdgeMapper::toDto)
                .toList();
    }

    private static boolean inWorkflow(Node node, Long workflowId) {
        return node.getWorkflow() != null && node.getWorkflow().getId().id().equals(workflowId);
    }
}
