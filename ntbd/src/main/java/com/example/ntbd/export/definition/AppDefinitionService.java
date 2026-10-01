package com.example.ntbd.export.definition;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.persistence.BranchRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** Builds an app's definition (what the exported app runs) from all contributors. */
@Service
@RequiredArgsConstructor
public class AppDefinitionService {

    private final BranchRepository branchRepository;
    private final List<AppDefinitionContributor> contributors;

    @Transactional
    public AppDefinition build(Long branchId) {
        Branch branch = branchRepository.findById(new Branch.BranchId(branchId))
                .orElseThrow(() -> new BranchNotFoundException(branchId));
        var application = branch.getApplication();
        ExportScope scope = new ExportScope(branchId, application.getId().id(), application.getTitle());

        AppDefinition definition = new AppDefinition(new AppDefinition.App(scope.applicationId(), scope.applicationName()));
        contributors.forEach(contributor -> contributor.contribute(scope, definition));
        return definition;
    }
}
