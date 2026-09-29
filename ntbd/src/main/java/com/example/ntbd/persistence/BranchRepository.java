package com.example.ntbd.persistence;

import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchRepository extends JpaRepository<Branch, Branch.BranchId> {

    boolean existsById(Branch.BranchId id);

    List<Branch> findBranchesByApplication_Id(Application.ApplicationId application_id);
}
