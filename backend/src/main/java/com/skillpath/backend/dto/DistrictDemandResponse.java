package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DistrictDemandResponse(
    @JsonProperty("from") String from,
    @JsonProperty("to") String to,
    @JsonProperty("districts") List<DistrictDemandItem> districts
) {}

