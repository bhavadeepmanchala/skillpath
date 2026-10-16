package com.skillpath.backend.repository;

import com.skillpath.backend.domain.TrainingPlan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingPlanRepository extends JpaRepository<TrainingPlan, Long> {
    List<TrainingPlan> findByDistrictId(Long districtId);
}
