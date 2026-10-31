package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SkillDemandItem(
    @JsonProperty("skillId") Long skillId,
    @JsonProperty("name") String name,
    @JsonProperty("category") String category,
    @JsonProperty("postingsWithSkill") long postingsWithSkill,
    @JsonProperty("share") double share
) {}

