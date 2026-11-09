package com.skillpath.backend.repository;

import com.skillpath.backend.domain.PlacementOutcome;
import com.skillpath.backend.domain.PlacementOutcomeId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlacementOutcomeRepository extends JpaRepository<PlacementOutcome, PlacementOutcomeId> {
    List<PlacementOutcome> findByCourseId(Long courseId);
    List<PlacementOutcome> findByDistrictId(Long districtId);
}
