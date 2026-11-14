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
    Boolean oversupplied,
    Boolean lowSample,
    Boolean obsolete,
    Double coverage,
    Double keySkillTrend,
    Integer keySkillCount,
    Integer fallingSkillCount
) {
    public CourseOversupplyItem(
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
        Boolean oversupplied,
        Boolean lowSample
    ) {
        this(
            courseId,
            courseName,
            districtId,
            districtName,
            year,
            seats,
            trainers,
            linkedRoleCount,
            postingsInWindow,
            estimatedOpenings,
            oversupplyRatio,
            oversupplied,
            lowSample,
            false,
            0.0,
            0.0,
            0,
            0
        );
    }
}
