package com.skillpath.backend.service;

import com.skillpath.backend.dto.ReadinessResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReadinessService {

    private final SeedStatus seedStatus;
    private final JdbcTemplate jdbcTemplate;

    public ReadinessService(SeedStatus seedStatus, JdbcTemplate jdbcTemplate) {
        this.seedStatus = seedStatus;
        this.jdbcTemplate = jdbcTemplate;
    }

    public SeedStatus getSeedStatus() {
        return seedStatus;
    }

    public ReadinessResponse getReadiness() {
        if (seedStatus.isSeedProfileActive()) {
            String phase = seedStatus.getPhase();
            boolean ready = SeedStatus.PHASE_READY.equals(phase);
            return new ReadinessResponse(ready, phase, true);
        }

        boolean hasRows = hasDemandMonthlyRows();
        if (hasRows) {
            return new ReadinessResponse(true, SeedStatus.PHASE_READY, false);
        } else {
            return new ReadinessResponse(false, SeedStatus.PHASE_EMPTY, false);
        }
    }

    private boolean hasDemandMonthlyRows() {
        try {
            Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM (SELECT 1 FROM demand_monthly LIMIT 1) t",
                Long.class
            );
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }
}

