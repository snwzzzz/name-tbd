package com.example.ntbd.persistence;

import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, User.UserId> {

    boolean existsByEmail(Email email);

    Optional<User> findByEmail(Email email);
}
