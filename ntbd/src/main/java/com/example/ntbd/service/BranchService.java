package com.example.ntbd.service;

import com.example.ntbd.Exception.ApplicationNotFoundException;
import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.UserNotFoundException;
import com.example.ntbd.auth.CurrentUser;
import com.example.ntbd.commands.NewBranchCommand;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.User;
import com.example.ntbd.dto.BranchDto;
import com.example.ntbd.mapper.BranchMapper;
import com.example.ntbd.persistence.ApplicationRepository;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.VersionControlRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@RequiredArgsConstructor

@Service
public class BranchService {

    private final BranchRepository branchRepository;
    private final ApplicationRepository applicationRepository;
    private final VersionControlRepository versionControlRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    @Transactional
    public BranchDto createBranch(NewBranchCommand command) {

        Application application = applicationRepository.findById(new Application.ApplicationId(command.applicationId()))
                .orElseThrow(() -> new ApplicationNotFoundException(command.applicationId()));

        User.UserId userId = currentUser.requireId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.id()));

        Branch branch = Branch.builder()
                .application(application)
                .createdBy(user)
                .name(command.name())
                .description(command.description())
                .build();

        return BranchMapper.toDto(branchRepository.saveAndFlush(branch));
    }

    @Transactional
    public void deleteBranch(Long branchId) {
        Branch branch = branchRepository.findById(new Branch.BranchId(branchId))
                .orElseThrow(() -> new BranchNotFoundException(branchId));
        Branch defaultBranch = branch.getApplication().getDefaultBranch();
        if (defaultBranch != null && defaultBranch.getId().equals(branch.getId())) {
            throw new IllegalArgumentException("The application's default branch can't be deleted");
        }

        branchRepository.deleteById(new Branch.BranchId(branchId));
    }

    @Transactional
    public List<BranchDto> findByApplicationId(Long applicationId) {
        return branchRepository.findBranchesByApplication_Id(new Application.ApplicationId(applicationId)).stream()
                .map(BranchMapper::toDto)
                .toList();
    }
}
