package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DemandSkillsResponse(
    @JsonProperty("from") String from,
    @JsonProperty("to") String to,
    @JsonProperty("roleId") Long roleId,
    @JsonProperty("districtId") Long districtId,
    @JsonProperty("totalPostingsInScope") long totalPostingsInScope,
    @JsonProperty("skills") List<SkillDemandItem> skills
) {}

