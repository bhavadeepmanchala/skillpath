package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record DistrictPlanResponse(
    @JsonProperty("districtId") Long districtId,
    @JsonProperty("districtName") String districtName,
    @JsonProperty("items") List<DistrictPlanCourseItem> items,
    @JsonProperty("counts") DistrictPlanCounts counts,
    @JsonProperty("totals") DistrictPlanTotals totals,
    @JsonProperty("synthetic") boolean synthetic,
    @JsonProperty("config") DistrictPlanConfig config
) {}
