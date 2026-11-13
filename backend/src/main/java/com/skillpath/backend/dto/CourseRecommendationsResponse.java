package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record CourseRecommendationsResponse(
    @JsonProperty("courseId") Long courseId,
    @JsonProperty("courseName") String courseName,
    @JsonProperty("districtId") Long districtId,
    @JsonProperty("latestWindow") TrendWindowRange latestWindow,
    @JsonProperty("previousWindow") TrendWindowRange previousWindow,
    @JsonProperty("maxItems") int maxItems,
    @JsonProperty("minShareForAdd") double minShareForAdd,
    @JsonProperty("retireMinDecline") double retireMinDecline,
    @JsonProperty("retireMaxShare") double retireMaxShare,
    @JsonProperty("minPostings") int minPostings,
    @JsonProperty("windowMonths") int windowMonths,
    @JsonProperty("add") List<CourseRecommendationItem> add,
    @JsonProperty("retire") List<CourseRecommendationItem> retire
) {}
