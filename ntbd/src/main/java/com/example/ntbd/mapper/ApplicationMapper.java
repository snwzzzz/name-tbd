package com.example.ntbd.mapper;

import com.example.ntbd.domain.Timestamps;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.dto.ApplicationDto;

public class ApplicationMapper  {

    public static ApplicationDto toDto(Application application) {
        if (application == null) return null;

        return new ApplicationDto(
                application.getId() != null ? application.getId().id() : null,
                application.getWorkspace() != null ? application.getWorkspace().getId().id() : null,
                application.getTitle(),
                application.getDescription(),
                application.getDefaultBranch() != null ? application.getDefaultBranch().getId().id() : null,
                Timestamps.toInstant(application.getLastModified()),
                displayName(application.getLastModifiedBy()),
                application.getTheme()
        );
    }

    /** "First Last", or the email when the name is empty. */
    static String displayName(User user) {
        if (user == null) return null;
        String name = (nullToEmpty(user.getFirstName()) + " " + nullToEmpty(user.getLastName())).trim();
        return name.isEmpty() ? user.getEmail().value() : name;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public static Application toEntity(ApplicationDto applicationDto) {
        if (applicationDto == null) return null;

        return Application.builder()
                .id(applicationDto.id() != null ? new Application.ApplicationId(applicationDto.id()) : null)
                .workspace(applicationDto.workspaceId() != null
                        ? Workspace.builder().id(new Workspace.WorkspaceId(applicationDto.workspaceId())).build()
                        : null)
                .title(applicationDto.title())
                .description(applicationDto.description())
                .build();
    }

}
