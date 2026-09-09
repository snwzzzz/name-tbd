package com.example.ntbd.mapper;

import com.example.ntbd.domain.Application;
import com.example.ntbd.dto.ApplicationDto;

public class ApplicationMapper  {

    public static ApplicationDto toDto(Application application) {
        if (application == null) return null;

        return new ApplicationDto(
                application.getId() != null ? application.getId().id() : null,
                application.getTitle(),
                application.getDescription()
        );
    }

    public static Application toEntity(ApplicationDto applicationDto) {
        if (applicationDto == null) return null;

        return Application.builder()
                .id(applicationDto.id() != null ? new Application.ApplicationId(applicationDto.id()) : null)
                .title(applicationDto.title())
                .description(applicationDto.description())
                .build();
    }

}
