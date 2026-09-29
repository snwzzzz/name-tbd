package com.example.ntbd.service;

import com.example.ntbd.Exception.NodeNotFoundException;
import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.commands.NewNodeCommand;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.mapper.NodeMapper;
import com.example.ntbd.persistence.NodeRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import com.example.ntbd.workflow.validation.NodeConfigValidator;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class NodeService {

    private final NodeRepository nodeRepository;
    private final WorkflowRepository workflowRepository;
    private final NodeConfigValidator nodeConfigValidator;

    @Transactional
    public NodeDto createNode(NewNodeCommand command) {
        Workflow workflow = workflowRepository.findById(new Workflow.WorkflowId(command.workflowId()))
                .orElseThrow(() -> new WorkflowNotFoundException(command.workflowId()));

        Node node = Node.builder()
                .workflow(workflow)
                .type(command.type())
                .props(command.props())
                .x(command.x())
                .y(command.y())
                .build();

        // Validate props against the type-specific schema before persisting
        nodeConfigValidator.validate(node);

        return NodeMapper.toDto(nodeRepository.saveAndFlush(node));
    }

    @Transactional
    public NodeDto findById(Long id) {
        return nodeRepository.findById(new Node.NodeId(id))
                .map(NodeMapper::toDto)
                .orElseThrow(() -> new NodeNotFoundException(id));
    }

    @Transactional
    public List<NodeDto> findByWorkflowId(Long workflowId) {
        return nodeRepository.findNodesByWorkflow_Id(new Workflow.WorkflowId(workflowId)).stream()
                .map(NodeMapper::toDto)
                .toList();
    }

    @Transactional
    public NodeDto updateNode(Long id, com.example.ntbd.commands.UpdateNodeCommand command) {
        Node node = nodeRepository.findById(new Node.NodeId(id))
                .orElseThrow(() -> new NodeNotFoundException(id));
        
        if (command.props() != null) {
            node.setProps(command.props());
            nodeConfigValidator.validate(node);
        }
        if (command.x() != null) {
            node.setX(command.x());
        }
        if (command.y() != null) {
            node.setY(command.y());
        }
        
        return NodeMapper.toDto(nodeRepository.saveAndFlush(node));
    }

    @Transactional
    public void deleteNode(Long id) {
        if (!nodeRepository.existsById(new Node.NodeId(id))) {
            throw new NodeNotFoundException(id);
        }
        nodeRepository.deleteById(new Node.NodeId(id));
    }
}
