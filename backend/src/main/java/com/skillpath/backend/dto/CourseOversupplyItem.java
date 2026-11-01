package com.skillpath.backend.dto;

public record CourseOversupplyItem(
    Long courseId,
    String courseName,
    Long districtId,
    String districtName,
    Integer year,
    Integer seats,
    Integer trainers,
    Long linkedRoleCount,
    Long postingsInWindow,
    Double estimatedOpenings,
    Double oversupplyRatio,
    Boolean oversupplied
) {}

