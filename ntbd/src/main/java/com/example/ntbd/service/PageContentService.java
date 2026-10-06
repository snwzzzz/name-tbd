package com.example.ntbd.service;

import com.example.ntbd.dto.PageContentDto;
import com.example.ntbd.dto.WorkflowDto;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** A page with everything the editor shows of it, in one answer (instead of one request per widget). */
@RequiredArgsConstructor
@Service
public class PageContentService {

    private final PageService pageService;
    private final UiComponentService uiComponentService;
    private final WorkflowService workflowService;
    private final NodeService nodeService;
    private final EdgeService edgeService;

    /** The page's workflow is created on first access, as by GET /api/pages/{id}/workflow. */
    @Transactional
    public PageContentDto load(Long pageId) {
        var page = pageService.findById(pageId);
        WorkflowDto workflow = workflowService.findOrCreateForPage(pageId);
        return new PageContentDto(
                page,
                uiComponentService.findByPageIdWithDefaults(pageId),
                new PageContentDto.PageWorkflowDto(
                        workflow.id(),
                        nodeService.findByWorkflowId(workflow.id()),
                        edgeService.findByWorkflowId(workflow.id())));
    }
}
