package com.example.ntbd.persistence;

import com.example.ntbd.domain.WidgetPropDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WidgetPropDefinitionRepository extends JpaRepository<WidgetPropDefinition, Long> {
    List<WidgetPropDefinition> findByWidgetType(String widgetType);
}
