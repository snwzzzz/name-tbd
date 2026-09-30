package com.example.ntbd.persistence;

import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EdgeRepository extends JpaRepository<Edge, Edge.EdgeId> {

    List<Edge> findBySourceNode_Workflow_Id(Workflow.WorkflowId workflowId);

    Optional<Edge> findBySourceNode_IdAndSourcePort(Node.NodeId sourceNodeId, String sourcePort);

    List<Edge> findBySourceNode_IdOrTargetNode_Id(Node.NodeId sourceNodeId, Node.NodeId targetNodeId);
}
