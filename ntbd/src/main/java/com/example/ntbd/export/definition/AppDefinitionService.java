package com.example.ntbd.export.definition;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContentReader;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.persistence.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

/** Builds an app's definition (what the exported app runs) from all contributors. */
@Service
@RequiredArgsConstructor
public class AppDefinitionService {

    private final BranchRepository branchRepository;
    private final BranchContentReader reader;
    private final List<AppDefinitionContributor> contributors;
    private final TransactionTemplate transactions;

    /** What a branch is, read in one transaction: its application and content. */
    private record BranchApp(Long applicationId, String name, BranchContent content) {
    }

    /** The definition of what's in a branch now, its data embedded. */
    public AppDefinition build(Long branchId) {
        return build(branchId, ExportOptions.EMBED);
    }

    /**
     * The definition of what's in a branch now. The branch is read in a transaction; contributors run after it
     * (embedding a live source's rows asks its system, which shouldn't hold a transaction).
     */
    public AppDefinition build(Long branchId, ExportOptions options) {
        BranchApp app = transactions.execute(status -> {
            Branch branch = branchRepository.findById(new Branch.BranchId(branchId))
                    .orElseThrow(() -> new BranchNotFoundException(branchId));
            var application = branch.getApplication();
            return new BranchApp(application.getId().id(), application.getTitle(), reader.read(branchId));
        });
        return build(app.applicationId(), app.name(), app.content(), options);
    }

    /** The definition of some content of an application (e.g. a saved version), its data embedded. */
    public AppDefinition build(Long applicationId, String applicationName, BranchContent content) {
        return build(applicationId, applicationName, content, ExportOptions.EMBED);
    }

    public AppDefinition build(Long applicationId, String applicationName, BranchContent content, ExportOptions options) {
        ExportScope scope = new ExportScope(applicationId, applicationName, content, options);
        AppDefinition definition = new AppDefinition(new AppDefinition.App(applicationId, applicationName));
        contributors.forEach(contributor -> contributor.contribute(scope, definition));
        return definition;
    }
}
