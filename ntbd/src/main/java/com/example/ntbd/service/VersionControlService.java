package com.example.ntbd.service;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.UserNotFoundException;
import com.example.ntbd.commands.NewVersionControlCommand;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Version;
import com.example.ntbd.domain.VersionControl;
import com.example.ntbd.dto.VersionControlDto;
import com.example.ntbd.mapper.VersionControlMapper;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.VersionControlRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VersionControlService {

    private final VersionControlRepository versionControlRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;

    @Transactional
    public VersionControlDto createVersion(NewVersionControlCommand command) {
        // 1. Find the branch or throw a not found exception
        Branch branch = branchRepository.findById(new Branch.BranchId(command.branchId()))
                .orElseThrow(() -> new BranchNotFoundException(command.branchId()));

        // 2. Find the user or throw a not found exception
        User user = userRepository.findById(new User.UserId(command.modifiedById()))
                .orElseThrow(() -> new UserNotFoundException(command.modifiedById()));

        // 3. Build and save the new version control (commit) entity
        VersionControl versionControl = VersionControl.builder()
                .branch(branch)
                .modifiedBy(user)
                .applicationDefinition(command.applicationDefinition())
                .version(new Version(command.version()))
                .build();

        VersionControl savedVersion = versionControlRepository.save(versionControl);

        // 5. Update the branch pointer and timestamp within the same transaction
        branch.setLatestVersion(versionControl.getVersion());
        branchRepository.save(branch);

        return VersionControlMapper.toDto(savedVersion);
    }

    @Transactional
    public List<VersionControlDto> findByBranchId(Long branchId) {
        return versionControlRepository.findVersionControlByBranchOrderByCreatedAt(new Branch.BranchId(branchId), Pageable.unpaged())
                .stream()
                .map(VersionControlMapper::toDto)
                .toList();
    }


    @Transactional
    public Optional<VersionControlDto> findLatestByBranchId(Long branchId) {
        return versionControlRepository
                .findVersionControlByBranchOrderByCreatedAt(
                        new Branch.BranchId(branchId),
                        PageRequest.of(0, 1)
                )
                .stream()
                .findFirst()
                .map(VersionControlMapper::toDto);
    }

     /*
    @Transactional
    public VersionControlDto revertToVersion(Long branchId, Long versionControlId) {
        // 1. Fetch the target historical version to copy from
        VersionControl targetVersion = versionControlRepository.findById(versionControlId)
                .orElseThrow(() -> new VersionControlNotFoundException(versionControlId));

        // Ensure the historical version actually belongs to this branch
        if (!targetVersion.getBranch().getId().equals(branchId)) {
            throw new IllegalArgumentException("Version does not belong to the specified branch");
        }

        // 2. Extract the definition from the old version and route through createVersion
        // Note: modifiedById should come from the current authenticated security context
        NewVersionControlCommand revertCommand = NewVersionControlCommand.builder()
                .branchId(branchId)
                .modifiedById(SecurityUtils.getCurrentUserId())
                .applicationDefinition(targetVersion.getApplicationDefinition())
                .build();

        return createVersion(revertCommand);
    }
     */
}
