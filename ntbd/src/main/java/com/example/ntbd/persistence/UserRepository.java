package com.example.ntbd.persistence;

import com.example.ntbd.domain.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, User.UserId> {
}
