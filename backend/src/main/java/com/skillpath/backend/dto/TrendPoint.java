package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TrendPoint(
    @JsonProperty("month") String month,
    @JsonProperty("postingsWithSkill") long postingsWithSkill,
    @JsonProperty("postingsTotal") long postingsTotal,
    @JsonProperty("share") double share
) {}

