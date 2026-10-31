package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record SkillTrendResponse(
    @JsonProperty("skillId") Long skillId,
    @JsonProperty("name") String name,
    @JsonProperty("roleId") Long roleId,
    @JsonProperty("districtId") Long districtId,
    @JsonProperty("points") List<TrendPoint> points
) {}

