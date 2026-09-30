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
    public EdgeDto createEdge(NewEdgeCommand command) {
        Node sourceNode = nodeRepository.findById(new Node.NodeId(command.sourceNodeId()))
                .orElseThrow(() -> new NodeNotFoundException(command.sourceNodeId()));

        Node targetNode = nodeRepository.findById(new Node.NodeId(command.targetNodeId()))
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

    @Transactional
    public void deleteEdge(Long id) {
        if (!edgeRepository.existsById(new Edge.EdgeId(id))) {
            throw new EdgeNotFoundException(id);
        }
        edgeRepository.deleteById(new Edge.EdgeId(id));
    }
}
