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
@Table(name = "demand_monthly")
@IdClass(DemandMonthlyId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemandMonthly {

    @Id
    @Column(name = "district_id", nullable = false)
    private Long districtId;

    @Id
    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Id
    @Column(name = "skill_id", nullable = false)
    private Long skillId;

    @Id
    @Column(name = "month", nullable = false, length = 7)
    private String month;

    @Column(name = "postings_with_skill", nullable = false)
    private Integer postingsWithSkill;

    @Column(name = "postings_total", nullable = false)
    private Integer postingsTotal;
}
