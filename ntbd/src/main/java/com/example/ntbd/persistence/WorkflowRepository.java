package com.example.ntbd.persistence;

import com.example.ntbd.domain.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WorkflowRepository extends JpaRepository<Workflow, Workflow.WorkflowId> {
    List<Workflow> findByBranch_Id(com.example.ntbd.domain.Branch.BranchId branchId);

    Optional<Workflow> findFirstByPage_Id(com.example.ntbd.domain.Page.PageId pageId);
}
