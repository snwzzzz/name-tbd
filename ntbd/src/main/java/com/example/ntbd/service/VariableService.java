package com.example.ntbd.service;

import com.example.ntbd.Exception.PageNotFoundException;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Page;
import com.example.ntbd.domain.VariableDefinition;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.PageRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** The variables of an app (on its branch) and of its pages, as the editor's Variables panel edits them. */
@RequiredArgsConstructor
@Service
public class VariableService {

    private final BranchRepository branchRepository;
    private final PageRepository pageRepository;

    @Transactional
    public List<VariableDefinition> appVariables(Long branchId) {
        return branch(branchId).getVariables();
    }

    /** Replaces the app's variables (checked: valid, unique names and known types). */
    @Transactional
    public List<VariableDefinition> setAppVariables(Long branchId, List<VariableDefinition> variables) {
        Branch branch = branch(branchId);
        branch.setVariables(VariableDefinition.checked(variables));
        return branchRepository.save(branch).getVariables();
    }

    /** Replaces a page's own variables. */
    @Transactional
    public List<VariableDefinition> setPageVariables(Long pageId, List<VariableDefinition> variables) {
        Page page = pageRepository.findById(new Page.PageId(pageId))
                .orElseThrow(() -> new PageNotFoundException("Page not found with id " + pageId));
        page.setVariables(VariableDefinition.checked(variables));
        return pageRepository.save(page).getVariables();
    }

    private Branch branch(Long branchId) {
        return branchRepository.findById(new Branch.BranchId(branchId))
                .orElseThrow(() -> new IllegalArgumentException("Branch not found: " + branchId));
    }
}
