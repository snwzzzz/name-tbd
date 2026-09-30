package com.example.ntbd.mapper;

import com.example.ntbd.domain.Page;
import com.example.ntbd.dto.PageDto;

public class PageMapper {

    public static PageDto toDto(Page page) {
        if (page == null) return null;

        return new PageDto(
                page.getId() != null ? page.getId().id() : null,
                page.getName(),
                page.getPath(),
                page.getBranch() != null && page.getBranch().getId() != null ? page.getBranch().getId().id() : null,
                page.isLayout()
        );
    }
}
