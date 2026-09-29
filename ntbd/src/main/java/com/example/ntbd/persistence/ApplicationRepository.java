package com.example.ntbd.persistence;

import com.example.ntbd.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Application.ApplicationId> {
}
