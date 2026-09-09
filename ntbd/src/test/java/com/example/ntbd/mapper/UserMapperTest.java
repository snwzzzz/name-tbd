package com.example.ntbd.mapper;

import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import com.example.ntbd.dto.UserDto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class UserMapperTest {

    @Test
    void testUserMapper() {
        User user = new User(
                new User.UserId(1L),
                new Username("testuser"),
                new Email("test@example.com"),
                "securePassword123",
                "Test",
                "User"
        );

        UserDto userDto = UserMapper.toDto(user);
        assertNotNull(userDto);
        assertEquals(user.getId().id(), userDto.id());
        assertEquals(user.getUsername().value(), userDto.username());
        assertEquals(user.getEmail().value(), userDto.email());
        assertEquals(user.getPassword(), userDto.password());
        assertEquals(user.getFirstName(), userDto.firstName());
        assertEquals(user.getLastName(), userDto.lastName());

        User mappedUser = UserMapper.toEntity(userDto);
        assertNotNull(mappedUser);
        assertEquals(userDto.id(), mappedUser.getId().id());
        assertEquals(userDto.username(), mappedUser.getUsername().value());
        assertEquals(userDto.email(), mappedUser.getEmail().value());
        assertEquals(userDto.password(), mappedUser.getPassword());
        assertEquals(userDto.firstName(), mappedUser.getFirstName());
        assertEquals(userDto.lastName(), mappedUser.getLastName());
    }

    @Test
    void testUserMapperWithNullId() {
        User user = new User(
                null,
                new Username("noiduser"),
                new Email("noid@example.com"),
                "pw",
                "No",
                "Id"
        );

        UserDto userDto = UserMapper.toDto(user);
        assertNotNull(userDto);
        assertNull(userDto.id());

        User mappedUser = UserMapper.toEntity(userDto);
        assertNotNull(mappedUser);
        assertNull(mappedUser.getId());
    }

    @Test
    void testUserMapperNullInputs() {
        assertNull(UserMapper.toDto(null));
        assertNull(UserMapper.toEntity(null));
    }
}
