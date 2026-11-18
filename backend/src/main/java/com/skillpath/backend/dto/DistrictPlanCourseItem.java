package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DistrictPlanCourseItem(
    @JsonProperty("courseId") Long courseId,
    @JsonProperty("courseName") String courseName,
    @JsonProperty("seats") Integer seats,
    @JsonProperty("trainers") Integer trainers,
    @JsonProperty("estimatedOpenings") Double estimatedOpenings,
    @JsonProperty("ratio") Double ratio,
    @JsonProperty("coverage") Double coverage,
    @JsonProperty("keySkillTrend") Double keySkillTrend,
    @JsonProperty("oversupplied") Boolean oversupplied,
    @JsonProperty("obsolete") Boolean obsolete,
    @JsonProperty("actions") List<String> actions,
    @JsonProperty("reasons") List<String> reasons,
    @JsonProperty("recommendedSeats") Integer recommendedSeats,
    @JsonProperty("seatChange") Integer seatChange,
    @JsonProperty("trainersNeeded") Integer trainersNeeded,
    @JsonProperty("trainerChange") Integer trainerChange,
    @JsonProperty("add") List<CourseRecommendationItem> add,
    @JsonProperty("retire") List<CourseRecommendationItem> retire
) {}
