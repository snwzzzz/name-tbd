package com.example.ntbd.service;

import com.example.ntbd.Exception.ApplicationNotFoundException;
import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.dto.BranchDto;
import com.example.ntbd.mapper.ApplicationMapper;
import com.example.ntbd.mapper.UserMapper;
import com.example.ntbd.persistence.ApplicationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;

    @Transactional
    public ApplicationDto createApplication(NewApplicationCommand newApplicationCommand) {
        var saved = applicationRepository.saveAndFlush(
                Application.builder()
                        .title(newApplicationCommand.title())
                        .description(newApplicationCommand.description())
                        .build()
        );

        return ApplicationMapper.toDto(saved);
    }

    @Transactional
    public List<ApplicationDto> findAll() {
        return applicationRepository.findAll().stream()
                .map(ApplicationMapper::toDto)
                .toList();
    }
}
