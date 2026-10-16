package com.skillpath.backend.repository;

import com.skillpath.backend.domain.CourseSkill;
import com.skillpath.backend.domain.CourseSkillId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseSkillRepository extends JpaRepository<CourseSkill, CourseSkillId> {
    List<CourseSkill> findByCourseId(Long courseId);
}
