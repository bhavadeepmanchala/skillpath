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
@Table(name = "course_offering")
@IdClass(CourseOfferingId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseOffering {

    @Id
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Id
    @Column(name = "district_id", nullable = false)
    private Long districtId;

    @Id
    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer seats;

    @Column(nullable = false)
    private Integer trainers;
}
