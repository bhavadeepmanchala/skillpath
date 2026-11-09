package com.skillpath.backend.dto;

public record CourseItem(
    Long id,
    String name,
    String sector,
    Integer durationWeeks,
    Long skillCount,
    Long linkedRoleCount
) {}

