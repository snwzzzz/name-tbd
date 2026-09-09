package com.example.ntbd.service;

import com.example.ntbd.Validation.PasswordValidator;
import com.example.ntbd.commands.NewUserCommand;
import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import com.example.ntbd.dto.UserDto;
import com.example.ntbd.mapper.UserMapper;
import com.example.ntbd.persistence.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@RequiredArgsConstructor

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserDto createUser(NewUserCommand newUserCommand) {

        PasswordValidator.validate(newUserCommand.password());

        var saved = userRepository.saveAndFlush(
                User.builder()
                        .username(new Username(newUserCommand.username()))
                        .email(new Email(newUserCommand.email()))
                        .password(passwordEncoder.encode(newUserCommand.password()))
                        .firstName(newUserCommand.firstName())
                        .lastName(newUserCommand.lastName())
                        .build()
        );

        return UserMapper.toDto(saved);
    }
}
