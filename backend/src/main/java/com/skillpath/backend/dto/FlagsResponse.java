package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.util.List;

public record FlagsResponse(
    int windowMonths,
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate windowStart,
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate windowEnd,
    double scalingFactor,
    double oversupplyThreshold,
    int minOpenings,
    double obsoleteCoverageThreshold,
    List<CourseOversupplyItem> items
) {
    public FlagsResponse(
        int windowMonths,
        LocalDate windowStart,
        LocalDate windowEnd,
        double scalingFactor,
        double oversupplyThreshold,
        int minOpenings,
        List<CourseOversupplyItem> items
    ) {
        this(
            windowMonths,
            windowStart,
            windowEnd,
            scalingFactor,
            oversupplyThreshold,
            minOpenings,
            40.0,
            items
        );
    }
}
