package com.skillpath.backend.domain;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlacementOutcomeId implements Serializable {
    private Long courseId;
    private Long districtId;
    private Integer year;
}
