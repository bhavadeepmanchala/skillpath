package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

public record CourseRecommendationItem(
    @JsonProperty("skillId") Long skillId,
    @JsonProperty("skillName") String skillName,
    @JsonProperty("latestShare") double latestShare,
    @JsonProperty("previousShare") double previousShare,
    @JsonProperty("trend") double trend,
    @JsonProperty("relativeGrowth") double relativeGrowth,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("score") Double score,
    @JsonProperty("postingsLatest") long postingsLatest
) {}

