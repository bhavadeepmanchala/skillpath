package com.skillpath.backend.repository;

import com.skillpath.backend.domain.CourseRole;
import com.skillpath.backend.domain.CourseRoleId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRoleRepository extends JpaRepository<CourseRole, CourseRoleId> {
    List<CourseRole> findByCourseId(Long courseId);
    List<CourseRole> findByRoleId(Long roleId);
}
