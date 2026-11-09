package com.skillpath.backend.repository;

import com.skillpath.backend.domain.DemandMonthly;
import com.skillpath.backend.domain.DemandMonthlyId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DemandMonthlyRepository extends JpaRepository<DemandMonthly, DemandMonthlyId> {
    List<DemandMonthly> findByRoleIdAndDistrictId(Long roleId, Long districtId);
    List<DemandMonthly> findByRoleIdAndDistrictIdAndMonth(Long roleId, Long districtId, String month);
}
