package com.skillpath.backend.repository;

import com.skillpath.backend.domain.CourseOffering;
import com.skillpath.backend.domain.CourseOfferingId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseOfferingRepository extends JpaRepository<CourseOffering, CourseOfferingId> {
    List<CourseOffering> findByCourseId(Long courseId);
    List<CourseOffering> findByDistrictId(Long districtId);
}
