package com.example.ntbd.persistence;

import com.example.ntbd.domain.AppKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AppKeyRepository extends JpaRepository<AppKey, Long> {

    Optional<AppKey> findByKeyHash(String keyHash);

    @Query("select k from AppKey k where k.application.id.id = :applicationId order by k.createdAt desc, k.id desc")
    List<AppKey> findByApplicationId(Long applicationId);
}
