package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DistrictDemandItem(
    @JsonProperty("districtId") Long districtId,
    @JsonProperty("name") String name,
    @JsonProperty("state") String state,
    @JsonProperty("postings") long postings
) {}

