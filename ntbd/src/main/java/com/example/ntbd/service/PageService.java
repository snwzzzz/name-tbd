package com.example.ntbd.service;

import com.example.ntbd.Exception.DuplicateResourceException;
import com.example.ntbd.Exception.PageNotFoundException;
import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Page;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.mapper.PageMapper;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.PageRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class PageService {

    private final PageRepository pageRepository;
    private final BranchRepository branchRepository;

    @Transactional
    public PageDto createPage(NewPageCommand command) {
        Branch branch = branchRepository.findById(new Branch.BranchId(command.branchId()))
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + command.branchId()));

        boolean layout = Boolean.TRUE.equals(command.layout());
        if (layout && pageRepository.existsByBranch_IdAndLayoutTrue(branch.getId())) {
            throw new DuplicateResourceException("Branch " + command.branchId() + " already has a layout page");
        }

        Page page = Page.builder()
                .name(command.name())
                .path(command.path())
                .branch(branch)
                .layout(layout)
                .build();

        return PageMapper.toDto(pageRepository.saveAndFlush(page));
    }

    @Transactional
    public List<PageDto> findByBranchId(Long branchId) {
        return pageRepository.findByBranch_Id(new Branch.BranchId(branchId)).stream()
                .map(PageMapper::toDto)
                .toList();
    }

    @Transactional
    public PageDto findById(Long id) {
        return pageRepository.findById(new Page.PageId(id))
                .map(PageMapper::toDto)
                .orElseThrow(() -> new PageNotFoundException("Page not found with id " + id));
    }
}
