package com.example.ntbd.persistence;

import com.example.ntbd.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PageRepository extends JpaRepository<Page, Page.PageId> {
    List<Page> findByBranch_Id(com.example.ntbd.domain.Branch.BranchId branchId);

    boolean existsByBranch_IdAndLayoutTrue(com.example.ntbd.domain.Branch.BranchId branchId);
}
