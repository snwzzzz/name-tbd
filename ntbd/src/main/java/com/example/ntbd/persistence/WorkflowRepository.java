package com.example.ntbd.persistence;

import com.example.ntbd.domain.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkflowRepository extends JpaRepository<Workflow, Workflow.WorkflowId> {
    List<Workflow> findByBranch_Id(com.example.ntbd.domain.Branch.BranchId branchId);
}
