package com.example.ntbd.service;

import com.example.ntbd.persistence.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor

@Service
public class BranchService {

    private final BranchRepository branchRepository;
}
