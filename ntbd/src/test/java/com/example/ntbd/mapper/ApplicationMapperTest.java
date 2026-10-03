package com.example.ntbd.mapper;

import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Workspace;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class ApplicationMapperTest {

    @Test
    void testApplicationMapper() {
        Application application = Application.builder()
                .id(new Application.ApplicationId(1L))
                .workspace(Workspace.builder().id(new Workspace.WorkspaceId(7L)).name("W").build())
                .title("Test App")
                .description("Test Description")
                .build();

        var applicationDto = ApplicationMapper.toDto(application);
        assertNotNull(applicationDto);
        assertEquals(application.getId().id(), applicationDto.id());
        assertEquals(7L, applicationDto.workspaceId());
        assertEquals(application.getTitle(), applicationDto.title());
        assertEquals(application.getDescription(), applicationDto.description());

        Application mappedApplication = ApplicationMapper.toEntity(applicationDto);
        assertNotNull(mappedApplication);
        assertEquals(applicationDto.id(), mappedApplication.getId().id());
        assertEquals(7L, mappedApplication.getWorkspace().getId().id());
        assertEquals(applicationDto.title(), mappedApplication.getTitle());
        assertEquals(applicationDto.description(), mappedApplication.getDescription());
    }

    @Test
    void testApplicationMapperWithNullId() {
        Application application = Application.builder()
                .id(null)
                .title("No Id App")
                .description("No Id Description")
                .build();

        var applicationDto = ApplicationMapper.toDto(application);
        assertNotNull(applicationDto);
        assertNull(applicationDto.id());

        Application mappedApplication = ApplicationMapper.toEntity(applicationDto);
        assertNotNull(mappedApplication);
        assertNull(mappedApplication.getId());
    }

    @Test
    void testApplicationMapperNullInputs() {
        assertNull(ApplicationMapper.toDto(null));
        assertNull(ApplicationMapper.toEntity(null));
    }
}
