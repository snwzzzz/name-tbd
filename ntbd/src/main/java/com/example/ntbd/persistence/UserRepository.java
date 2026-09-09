package com.example.ntbd.persistence;

import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, User.UserId> {

    boolean existsByUsername(Username username);

    boolean existsByEmail(Email email);
}
