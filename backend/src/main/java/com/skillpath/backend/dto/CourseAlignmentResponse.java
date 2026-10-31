package com.skillpath.backend.dto;

import java.util.List;

public record CourseAlignmentResponse(
    Long courseId,
    String courseName,
    Long roleId,
    String roleName,
    Long districtId,
    Integer windowMonths,
    Integer topN,
    Long postingsInScope,
    Boolean roleLinkedToCourse,
    Double coverageScore,
    List<SkillShareItem> coveredSkills,
    List<SkillShareItem> missingSkills
) {}

