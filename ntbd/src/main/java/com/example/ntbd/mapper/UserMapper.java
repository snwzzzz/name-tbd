package com.example.ntbd.mapper;

import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import com.example.ntbd.dto.UserDto;

public class UserMapper {

    public static UserDto toDto(User user) {
        if (user == null) return null;

        return new UserDto(
                user.getId() != null ? user.getId().id() : null,
                user.getUsername() != null ? user.getUsername().value() : null,
                user.getEmail().value(),
                user.getFirstName(),
                user.getLastName(),
                user.getAvatarUrl()
        );
    }

    public static User toEntity(UserDto userDto) {
        if (userDto == null) return null;

        return new User(
                userDto.id() != null ? new User.UserId(userDto.id()) : null,
                userDto.username() != null ? new Username(userDto.username()) : null,
                userDto.email() != null ? new Email(userDto.email()) : null,
                userDto.firstName(),
                userDto.lastName(),
                userDto.avatarUrl()
        );
    }
}
