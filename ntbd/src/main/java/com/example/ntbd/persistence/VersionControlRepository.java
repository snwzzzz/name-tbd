package com.example.ntbd.persistence;

import com.example.ntbd.domain.VersionControl;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VersionControlRepository extends JpaRepository<VersionControl, VersionControl.VersionControlId>
{
}
