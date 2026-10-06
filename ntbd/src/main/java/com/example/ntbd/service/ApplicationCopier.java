package com.example.ntbd.service;

import com.example.ntbd.Exception.ApplicationNotFoundException;
import com.example.ntbd.content.BranchContentReader;
import com.example.ntbd.content.BranchContentWriter;
import com.example.ntbd.domain.*;
import com.example.ntbd.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Copies an application: its default branch with the pages, widgets, workflows (nodes, edges) and
 * data sources in it, as the new application's default branch. Versions stay behind (the copy starts
 * its own history), and so do other branches.
 * <p>
 * The branch is read as {@link com.example.ntbd.content.BranchContent} and written into the copy's,
 * which gives everything new ids and rewrites the ids stored inside ({@link BranchContentWriter}).
 */
@RequiredArgsConstructor
@Component
public class ApplicationCopier {

    private final ApplicationRepository applicationRepository;
    private final BranchRepository branchRepository;
    private final BranchContentReader reader;
    private final BranchContentWriter writer;

    /** Copies the application within its workspace, titled {@code title}, created by {@code user}. Call within a transaction. */
    public Application copy(Long applicationId, String title, User user) {
        Application source = applicationRepository.findById(new Application.ApplicationId(applicationId))
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
        Branch sourceBranch = source.getDefaultBranch();

        Application copy = applicationRepository.save(Application.builder()
                .workspace(source.getWorkspace())
                .title(title)
                .description(source.getDescription())
                .theme(source.getTheme())
                .lastModifiedBy(user)
                .build());
        Branch branch = branchRepository.save(Branch.builder()
                .application(copy)
                .createdBy(user)
                .name(ApplicationService.DEFAULT_BRANCH_NAME)
                .description("")
                .build());
        copy.setDefaultBranch(branch);

        if (sourceBranch != null) writer.write(reader.read(sourceBranch.getId().id()), branch);
        return applicationRepository.saveAndFlush(copy);
    }
}
