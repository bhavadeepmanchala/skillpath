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
@Table(name = "course_role")
@IdClass(CourseRoleId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseRole {

    @Id
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Id
    @Column(name = "role_id", nullable = false)
    private Long roleId;
}
