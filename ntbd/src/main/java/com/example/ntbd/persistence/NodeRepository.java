package com.example.ntbd.persistence;

import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NodeRepository extends JpaRepository<Node, Node.NodeId> {

    List<Node> findNodesByWorkflow_Id(Workflow.WorkflowId workflowId);
}
