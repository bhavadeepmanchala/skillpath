package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SkillTrendItem(
    @JsonProperty("skillId") Long skillId,
    @JsonProperty("name") String name,
    @JsonProperty("category") String category,
    @JsonProperty("shareLatest") double shareLatest,
    @JsonProperty("sharePrevious") double sharePrevious,
    @JsonProperty("change") double change,
    @JsonProperty("relativeGrowth") Double relativeGrowth,
    @JsonProperty("postingsLatest") long postingsLatest,
    @JsonProperty("postingsPrevious") long postingsPrevious
) {}

