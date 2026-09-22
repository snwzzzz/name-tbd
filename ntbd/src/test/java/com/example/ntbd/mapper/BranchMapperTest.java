package com.example.ntbd.mapper;

import com.example.ntbd.domain.*;
import com.example.ntbd.dto.BranchDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class BranchMapperTest {

    @Test
    void testBranchMapper() {
        User user = User.builder().id(new User.UserId(1L)).username(new Username("dsds")).email(new Email("snwzishot@gmail.com")).build();
        Application application = Application.builder().id(new Application.ApplicationId(2L)).build();

        Branch branch = Branch.builder()
                .id(new Branch.BranchId(10L))
                .name("main")
                .description("Main branch")
                .createdAt(LocalDateTime.of(2026, 1, 1, 12, 0))
                .lastModified(LocalDateTime.of(2026, 1, 2, 12, 0))
                .latestVersion(new Version("1.0.0"))
                .createdBy(user)
                .application(application)
                .build();

        BranchDto branchDto = BranchMapper.toDto(branch);
        assertNotNull(branchDto);
        assertEquals(branch.getId().id(), branchDto.id());
        assertEquals(branch.getName(), branchDto.name());
        assertEquals(branch.getDescription(), branchDto.description());
        assertEquals(branch.getCreatedAt(), branchDto.createdAt());
        assertEquals(branch.getLastModified(), branchDto.lastModified());
        assertEquals(branch.getLatestVersion().value(), branchDto.latestVersion());
        assertNotNull(branchDto.createdBy());
        assertEquals(user.getId().id(), branchDto.createdBy().id());
        assertNotNull(branchDto.application());
        assertEquals(application.getId().id(), branchDto.application().id());

        Branch mappedBranch = BranchMapper.toEntity(branchDto);
        assertNotNull(mappedBranch);
        assertEquals(branchDto.id(), mappedBranch.getId().id());
        assertEquals(branchDto.name(), mappedBranch.getName());
        assertEquals(branchDto.description(), mappedBranch.getDescription());
        assertEquals(branchDto.createdAt(), mappedBranch.getCreatedAt());
        assertEquals(branchDto.lastModified(), mappedBranch.getLastModified());
        assertEquals(branchDto.latestVersion(), mappedBranch.getLatestVersion().value());
        assertNotNull(mappedBranch.getCreatedBy());
        assertEquals(branchDto.createdBy().id(), mappedBranch.getCreatedBy().getId().id());
        assertNotNull(mappedBranch.getApplication());
        assertEquals(branchDto.application().id(), mappedBranch.getApplication().getId().id());
    }

    @Test
    void testBranchMapperWithNullRelations() {
        Branch branch = Branch.builder()
                .id(null)
                .name("no-relations")
                .description("No relations set")
                .createdAt(LocalDateTime.now())
                .lastModified(null)
                .latestVersion(null)
                .createdBy(null)
                .application(null)
                .build();

        BranchDto branchDto = BranchMapper.toDto(branch);
        assertNotNull(branchDto);
        assertNull(branchDto.id());
        assertNull(branchDto.createdBy());
        assertNull(branchDto.application());

        Branch mappedBranch = BranchMapper.toEntity(branchDto);
        assertNotNull(mappedBranch);
        assertNull(mappedBranch.getId());
        assertNull(mappedBranch.getCreatedBy());
        assertNull(mappedBranch.getApplication());
    }

    @Test
    void testBranchMapperNullInputs() {
        assertNull(BranchMapper.toDto(null));
        assertNull(BranchMapper.toEntity(null));
    }

}
