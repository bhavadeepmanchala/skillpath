package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SkillDemandItem(
    @JsonProperty("skillId") Long skillId,
    @JsonProperty("name") String name,
    @JsonProperty("category") String category,
    @JsonProperty("postingsWithSkill") long postingsWithSkill,
    @JsonProperty("share") double share,
    @JsonProperty("confirmedCount") long confirmedCount,
    @JsonProperty("disputedCount") long disputedCount,
    @JsonProperty("confidence") double confidence
) {
    public SkillDemandItem(Long skillId, String name, String category, long postingsWithSkill, double share) {
        this(skillId, name, category, postingsWithSkill, share, 0L, 0L, 0.5);
    }
}
