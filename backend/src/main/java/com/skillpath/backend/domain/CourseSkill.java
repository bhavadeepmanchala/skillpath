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
@Table(name = "course_skill")
@IdClass(CourseSkillId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseSkill {

    @Id
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Id
    @Column(name = "skill_id", nullable = false)
    private Long skillId;

    @Column(name = "taught_level")
    private String taughtLevel;
}
