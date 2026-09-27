package com.example.ntbd.service;

import com.example.ntbd.Exception.PasswordValidationException;
import com.example.ntbd.Exception.PasswordValidationExceptionTest;
import com.example.ntbd.commands.NewUserCommand;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import com.example.ntbd.dto.UserDto;
import com.example.ntbd.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserService userService;

    private static final String VALID_PASSWORD = "Str0ng!Password123";

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder);
    }

    @Test
    void createUser_savesUserWithEncodedPassword() {
        var command = new NewUserCommand(
                "jdoe", "jdoe@example.com", VALID_PASSWORD, "Jane", "Doe"
        );

        var savedEntity = User.builder()
                .username(command.username() != null ? new Username(command.username()) : null)
                .build();

        when(passwordEncoder.encode(VALID_PASSWORD)).thenReturn("hashed-value");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDto result = userService.createUser(command);

        assertThat(result).isNotNull();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());

        assertThat(captor.getValue().getPassword()).isEqualTo("hashed-value");
        verify(passwordEncoder).encode(VALID_PASSWORD);
    }

    @Test
    void createUser_rejectsWeakPassword_andNeverSaves() {
        var command = new NewUserCommand(
                "jdoe", "jdoe@example.com", "short", "Jane", "Doe"
        );

        assertThatThrownBy(() -> userService.createUser(command))
                .isInstanceOf(PasswordValidationException.class);

        verify(userRepository, never()).saveAndFlush(any());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void createUser_neverPassesRawPasswordToRepository() {
        var command = new NewUserCommand(
                "jdoe", "jdoe@example.com", VALID_PASSWORD, "Jane", "Doe"
        );

        when(passwordEncoder.encode(VALID_PASSWORD)).thenReturn("hashed-value");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.createUser(command);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());

        assertThat(captor.getValue().getPassword())
                .isNotEqualTo(VALID_PASSWORD)
                .isEqualTo("hashed-value");
    }
}
