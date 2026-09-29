package com.example.ntbd.service;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.commands.NewWorkflowCommand;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.WorkflowDto;
import com.example.ntbd.mapper.WorkflowMapper;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final BranchRepository branchRepository;

    @Transactional
    public WorkflowDto createWorkflow(NewWorkflowCommand command) {
        Branch branch = null;
        if (command.branchId() != null) {
            branch = branchRepository.findById(new Branch.BranchId(command.branchId()))
                    .orElseThrow(() -> new BranchNotFoundException(command.branchId()));
        }

        Workflow workflow = Workflow.builder()
                .name(command.name())
                .status(command.status() != null ? command.status() : WorkflowStatus.DRAFT)
                .branch(branch)
                .build();

        return WorkflowMapper.toDto(workflowRepository.saveAndFlush(workflow));
    }

    @Transactional
    public WorkflowDto findById(Long id) {
        return workflowRepository.findById(new Workflow.WorkflowId(id))
                .map(WorkflowMapper::toDto)
                .orElseThrow(() -> new WorkflowNotFoundException(id));
    }

    @Transactional
    public List<WorkflowDto> findByBranchId(Long branchId) {
        return workflowRepository.findByBranch_Id(new Branch.BranchId(branchId)).stream()
                .map(WorkflowMapper::toDto)
                .toList();
    }

    @Transactional
    public void deleteWorkflow(Long id) {
        if (!workflowRepository.existsById(new Workflow.WorkflowId(id))) {
            throw new WorkflowNotFoundException(id);
        }
        workflowRepository.deleteById(new Workflow.WorkflowId(id));
    }
}
