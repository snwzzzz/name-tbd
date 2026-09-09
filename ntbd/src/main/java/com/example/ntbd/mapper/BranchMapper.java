package com.example.ntbd.mapper;

import com.example.ntbd.domain.Branch;
import com.example.ntbd.dto.BranchDto;

public class BranchMapper {

    public static BranchDto toDto(Branch branch) {
        if (branch == null) return null;

        return new BranchDto(
                branch.getId() != null ? branch.getId().id() : null,
                branch.getName(),
                branch.getDescription(),
                branch.getCreatedAt(),
                branch.getLastModified(),
                branch.getLatestVersion(),
                UserMapper.toDto(branch.getCreatedBy()),
                ApplicationMapper.toDto(branch.getApplication())
        );
    }

    public static Branch toEntity(BranchDto branchDto) {
        if (branchDto == null) return null;

        return Branch.builder()
                .id(branchDto.id() != null ? new Branch.BranchId(branchDto.id()) : null)
                .name(branchDto.name())
                .description(branchDto.description())
                .createdAt(branchDto.createdAt())
                .lastModified(branchDto.lastModified())
                .latestVersion(branchDto.latestVersion())
                .createdBy(UserMapper.toEntity(branchDto.createdBy()))
                .application(ApplicationMapper.toEntity(branchDto.application()))
                .build();
    }

}
