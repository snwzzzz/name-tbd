package com.example.ntbd.export.definition;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContentReader;
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
    private final BranchContentReader reader;
    private final List<AppDefinitionContributor> contributors;

    /** The definition of what's in a branch now. */
    @Transactional
    public AppDefinition build(Long branchId) {
        Branch branch = branchRepository.findById(new Branch.BranchId(branchId))
                .orElseThrow(() -> new BranchNotFoundException(branchId));
        var application = branch.getApplication();
        return build(application.getId().id(), application.getTitle(), reader.read(branchId));
    }

    /** The definition of some content of an application (e.g. a saved version). */
    public AppDefinition build(Long applicationId, String applicationName, BranchContent content) {
        ExportScope scope = new ExportScope(applicationId, applicationName, content);
        AppDefinition definition = new AppDefinition(new AppDefinition.App(applicationId, applicationName));
        contributors.forEach(contributor -> contributor.contribute(scope, definition));
        return definition;
    }
}
