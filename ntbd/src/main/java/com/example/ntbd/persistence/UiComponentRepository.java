package com.example.ntbd.persistence;

import com.example.ntbd.domain.UiComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UiComponentRepository extends JpaRepository<UiComponent, UiComponent.UiComponentId> {
    List<UiComponent> findByPage_Id(com.example.ntbd.domain.Page.PageId pageId);
}
