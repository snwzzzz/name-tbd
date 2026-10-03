package com.example.ntbd.service;

import com.example.ntbd.Exception.WorkspaceNotFoundException;
import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.mapper.ApplicationMapper;
import com.example.ntbd.persistence.ApplicationRepository;
import com.example.ntbd.persistence.WorkspaceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final WorkspaceRepository workspaceRepository;

    @Transactional
    public ApplicationDto createApplication(NewApplicationCommand newApplicationCommand) {
        if (newApplicationCommand.workspaceId() == null) {
            throw new IllegalArgumentException("workspaceId is required");
        }
        Workspace workspace = workspaceRepository.findById(new Workspace.WorkspaceId(newApplicationCommand.workspaceId()))
                .orElseThrow(() -> new WorkspaceNotFoundException(newApplicationCommand.workspaceId()));

        var saved = applicationRepository.saveAndFlush(
                Application.builder()
                        .workspace(workspace)
                        .title(newApplicationCommand.title())
                        .description(newApplicationCommand.description())
                        .build()
        );

        return ApplicationMapper.toDto(saved);
    }

    @Transactional
    public List<ApplicationDto> findInWorkspaces(List<Long> workspaceIds) {
        if (workspaceIds.isEmpty()) return List.of();
        return applicationRepository.findByWorkspaceIds(workspaceIds).stream()
                .map(ApplicationMapper::toDto)
                .toList();
    }
}
