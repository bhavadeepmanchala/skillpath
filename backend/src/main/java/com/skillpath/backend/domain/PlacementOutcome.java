package com.skillpath.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "placement_outcome")
@IdClass(PlacementOutcomeId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlacementOutcome {

    @Id
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Id
    @Column(name = "district_id", nullable = false)
    private Long districtId;

    @Id
    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "placed_pct", nullable = false)
    private Double placedPct;
}
