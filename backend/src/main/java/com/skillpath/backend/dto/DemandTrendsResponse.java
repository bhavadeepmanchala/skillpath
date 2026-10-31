package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DemandTrendsResponse(
    @JsonProperty("window") int window,
    @JsonProperty("minPostings") int minPostings,
    @JsonProperty("roleId") Long roleId,
    @JsonProperty("districtId") Long districtId,
    @JsonProperty("latestWindow") TrendWindowRange latestWindow,
    @JsonProperty("previousWindow") TrendWindowRange previousWindow,
    @JsonProperty("rising") List<SkillTrendItem> rising,
    @JsonProperty("declining") List<SkillTrendItem> declining
) {}

