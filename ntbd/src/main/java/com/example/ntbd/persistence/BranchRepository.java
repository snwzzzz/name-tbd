package com.example.ntbd.persistence;

import com.example.ntbd.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Branch.BranchId> {
}
