package com.example.ntbd.persistence;

import com.example.ntbd.domain.UserIdentity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, UserIdentity.UserIdentityId> {

    Optional<UserIdentity> findByIssuerAndSubject(String issuer, String subject);
}
