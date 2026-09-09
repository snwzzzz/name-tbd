package com.example.ntbd.mapper;

import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Version;
import com.example.ntbd.domain.VersionControl;
import com.example.ntbd.dto.VersionControlDto;

public class VersionControlMapper {

    public static VersionControlDto toDto(VersionControl versionControl) {
        if (versionControl == null) return null;

        return new VersionControlDto(
                versionControl.getId() != null ? versionControl.getId().id() : null,
                versionControl.getVersion() != null ? versionControl.getVersion().value() : null,
                BranchMapper.toDto(versionControl.getBranch()),
                versionControl.getTimestamp(),
                versionControl.getApplicationDefinition(),
                UserMapper.toDto(versionControl.getModifiedBy())
        );
    }

    public static VersionControl toEntity(VersionControlDto versionControlDto) {
        if (versionControlDto == null) return null;

        return VersionControl.builder()
                .id(versionControlDto.id() != null ? new VersionControl.VersionControlId(versionControlDto.id()) : null)
                .version(versionControlDto.version() != null ? new Version(versionControlDto.version()) : null)
                .branch(BranchMapper.toEntity(versionControlDto.branch()))
                .timestamp(versionControlDto.timestamp())
                .applicationDefinition(versionControlDto.applicationDefinition())
                .modifiedBy(UserMapper.toEntity(versionControlDto.modifiedBy()))
                .build();
    }

}
