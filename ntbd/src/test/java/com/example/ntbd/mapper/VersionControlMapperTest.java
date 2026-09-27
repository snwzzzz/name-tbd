package com.example.ntbd.mapper;

import com.example.ntbd.domain.*;
import com.example.ntbd.dto.VersionControlDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class VersionControlMapperTest {

    @Test
    void testVersionControlMapper() {
        User user = User.builder().id(new User.UserId(1L)).username(new Username("dsds")).email(new Email("snwzishot@gmail.com")).build();
        Application application = Application.builder().id(new Application.ApplicationId(9L)).build();
        User branchCreator = User.builder().id(new User.UserId(1L)).username(new Username("dsds")).email(new Email("snwzishot@gmail.com")).build();

        Branch branch = Branch.builder()
                .id(new Branch.BranchId(5L))
                .name("main")
                .description("Main branch")
                
                .createdBy(branchCreator)
                .application(application)
                .build();

        VersionControl versionControl = VersionControl.builder()
                .id(new VersionControl.VersionControlId(100L))
                .version(new Version("1.0.0"))
                .branch(branch)
                
                .applicationDefinition("{}")
                .modifiedBy(user)
                .build();

        VersionControlDto dto = VersionControlMapper.toDto(versionControl);
        assertNotNull(dto);
        assertEquals(versionControl.getId().id(), dto.id());
        assertEquals(versionControl.getVersion().value(), dto.version());
        assertNotNull(dto.branch());
        assertEquals(branch.getId().id(), dto.branch().id());
        assertEquals(branch.getName(), dto.branch().name());
        assertEquals(versionControl.getCreatedAt(), dto.timestamp());
        assertEquals(versionControl.getApplicationDefinition(), dto.applicationDefinition());
        assertNotNull(dto.modifiedBy());
        assertEquals(user.getId().id(), dto.modifiedBy().id());

        VersionControl mapped = VersionControlMapper.toEntity(dto);
        assertNotNull(mapped);
        assertEquals(dto.id(), mapped.getId().id());
        assertEquals(dto.version(), mapped.getVersion().value());
        assertNotNull(mapped.getBranch());
        assertEquals(dto.branch().name(), mapped.getBranch().getName());
        assertEquals(dto.timestamp(), mapped.getCreatedAt());
        assertEquals(dto.applicationDefinition(), mapped.getApplicationDefinition());
        assertNotNull(mapped.getModifiedBy());
        assertEquals(dto.modifiedBy().id(), mapped.getModifiedBy().getId().id());
    }

    @Test
    void testVersionControlMapperWithNullIdAndModifiedBy() {
        Branch branch = Branch.builder()
                .id(new Branch.BranchId(7L))
                .name("dev")
                .description("Dev branch")
                
                .build();

        VersionControl versionControl = VersionControl.builder()
                .id(null)
                .version(new Version("2.0.0"))
                .branch(branch)
                
                .applicationDefinition("{}")
                .modifiedBy(null)
                .build();

        VersionControlDto dto = VersionControlMapper.toDto(versionControl);
        assertNotNull(dto);
        assertNull(dto.id());
        assertNull(dto.modifiedBy());
        assertNotNull(dto.branch());

        VersionControl mapped = VersionControlMapper.toEntity(dto);
        assertNotNull(mapped);
        assertNull(mapped.getId());
        assertNull(mapped.getModifiedBy());
    }

    @Test
    void testVersionControlMapperNullInputs() {
        assertNull(VersionControlMapper.toDto(null));
        assertNull(VersionControlMapper.toEntity(null));
    }
}
