package com.example.ntbd.service;

import com.example.ntbd.Exception.ApplicationNotFoundException;
import com.example.ntbd.Exception.UserNotFoundException;
import com.example.ntbd.Exception.WorkspaceNotFoundException;
import com.example.ntbd.auth.CurrentUser;
import com.example.ntbd.commands.DuplicateApplicationCommand;
import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.commands.UpdateApplicationCommand;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.mapper.ApplicationMapper;
import com.example.ntbd.persistence.ApplicationRepository;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.WorkspaceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor

@Service
public class ApplicationService {

    /** The branch every application starts with (and the editor opens). */
    static final String DEFAULT_BRANCH_NAME = "main";

    private final ApplicationRepository applicationRepository;
    private final WorkspaceRepository workspaceRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;
    private final ApplicationCopier copier;

    /** A new application in the workspace, with its default branch; the signed-in user creates it. */
    @Transactional
    public ApplicationDto createApplication(NewApplicationCommand newApplicationCommand) {
        if (newApplicationCommand.workspaceId() == null) {
            throw new IllegalArgumentException("workspaceId is required");
        }
        Workspace workspace = workspaceRepository.findById(new Workspace.WorkspaceId(newApplicationCommand.workspaceId()))
                .orElseThrow(() -> new WorkspaceNotFoundException(newApplicationCommand.workspaceId()));
        User.UserId userId = currentUser.requireId();
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId.id()));

        Application application = applicationRepository.save(
                Application.builder()
                        .workspace(workspace)
                        .title(requireTitle(newApplicationCommand.title()))
                        .description(newApplicationCommand.description() != null ? newApplicationCommand.description().trim() : "")
                        .lastModifiedBy(user)
                        .build()
        );
        Branch branch = branchRepository.save(Branch.builder()
                .application(application)
                .createdBy(user)
                .name(DEFAULT_BRANCH_NAME)
                .description("")
                .build());
        application.setDefaultBranch(branch);

        return ApplicationMapper.toDto(applicationRepository.saveAndFlush(application));
    }

    @Transactional
    public ApplicationDto findById(Long id) {
        return applicationRepository.findById(new Application.ApplicationId(id))
                .map(ApplicationMapper::toDto)
                .orElseThrow(() -> new ApplicationNotFoundException(id));
    }

    @Transactional
    public List<ApplicationDto> findInWorkspaces(List<Long> workspaceIds) {
        if (workspaceIds.isEmpty()) return List.of();
        return applicationRepository.findByWorkspaceIds(workspaceIds).stream()
                .map(ApplicationMapper::toDto)
                .toList();
    }

    @Transactional
    public ApplicationDto updateApplication(Long id, UpdateApplicationCommand command) {
        Application application = applicationRepository.findById(new Application.ApplicationId(id))
                .orElseThrow(() -> new ApplicationNotFoundException(id));
        if (command.title() != null) application.setTitle(requireTitle(command.title()));
        if (command.description() != null) application.setDescription(command.description().trim());
        return ApplicationMapper.toDto(applicationRepository.saveAndFlush(application));
    }

    /**
     * A copy of the application (its default branch: pages, widgets, workflows, data) in the same
     * workspace; the signed-in user creates it. See ApplicationCopier.
     */
    @Transactional
    public ApplicationDto duplicateApplication(Long id, DuplicateApplicationCommand command) {
        Application source = applicationRepository.findById(new Application.ApplicationId(id))
                .orElseThrow(() -> new ApplicationNotFoundException(id));
        String title = command != null && command.title() != null && !command.title().isBlank()
                ? command.title()
                : copyTitle(source.getTitle());
        User.UserId userId = currentUser.requireId();
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId.id()));
        return ApplicationMapper.toDto(copier.copy(id, requireTitle(title), user));
    }

    /** "Shop" → "Shop (copy)", kept within the title's length limit. */
    static String copyTitle(String title) {
        String suffix = " (copy)";
        String base = title.length() + suffix.length() > 255 ? title.substring(0, 255 - suffix.length()) : title;
        return base + suffix;
    }

    /** Deletes the application with all its branches, pages, workflows, data and versions. */
    @Transactional
    public void deleteApplication(Long id) {
        if (applicationRepository.deleteWithEverything(id) == 0) {
            throw new ApplicationNotFoundException(id);
        }
    }

    private static String requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("An application needs a title");
        }
        String trimmed = title.trim();
        if (trimmed.length() > 255) {
            throw new IllegalArgumentException("An application's title can have at most 255 characters");
        }
        return trimmed;
    }
}
