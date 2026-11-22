package com.skillpath.backend.generator;

import com.skillpath.backend.service.OversupplyService;
import com.skillpath.backend.service.SeedStatus;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("seed")
public class SeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);

    private final DataGenerator dataGenerator;
    private final CourseGenerator courseGenerator;
    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;
    private final SeedStatus seedStatus;
    private final OversupplyService oversupplyService;

    public SeedRunner(
        DataGenerator dataGenerator,
        CourseGenerator courseGenerator,
        DataSource dataSource,
        JdbcTemplate jdbcTemplate,
        SeedStatus seedStatus
    ) {
        this(dataGenerator, courseGenerator, dataSource, jdbcTemplate, seedStatus, null);
    }

    @Autowired
    public SeedRunner(
        DataGenerator dataGenerator,
        CourseGenerator courseGenerator,
        DataSource dataSource,
        JdbcTemplate jdbcTemplate,
        SeedStatus seedStatus,
        @Autowired(required = false) OversupplyService oversupplyService
    ) {
        this.dataGenerator = dataGenerator;
        this.courseGenerator = courseGenerator;
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
        this.seedStatus = seedStatus;
        this.oversupplyService = oversupplyService;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        String productName = "Unknown";
        boolean isH2Mem = false;
        boolean isPostgres = false;

        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            productName = metaData.getDatabaseProductName();
            String url = metaData.getURL();
            if (productName != null && productName.equalsIgnoreCase("H2") && url != null && url.contains(":mem:")) {
                isH2Mem = true;
            }
            if (productName != null && productName.equalsIgnoreCase("PostgreSQL")) {
                isPostgres = true;
            }
        }

        log.info("Running synthetic data seed against database product: {}", productName);

        if (oversupplyService != null) {
            oversupplyService.clearCache();
        }

        if (isH2Mem) {
            log.warn("================================================================================");
            log.warn("WARNING: The active datasource is an in-memory H2 database!");
            log.warn("Seeded data will disappear as soon as the application process terminates.");
            log.warn("================================================================================");
        }

        try {
            if (isDatabasePopulated(isH2Mem)) {
                log.info("Database tables are populated; skipping synthetic data seeding.");
                if (oversupplyService != null) {
                    oversupplyService.clearCache();
                    try {
                        oversupplyService.warmUp();
                    } catch (Throwable t) {
                        log.warn("Flags cache warm-up failed, continuing startup without warm cache: {}", t.getMessage());
                    }
                }
                seedStatus.setPhase(SeedStatus.PHASE_READY);
                return;
            }

            if (isH2Mem) {
                jdbcTemplate.execute("DELETE FROM employer_validation");
            }
            dataGenerator.run();
            courseGenerator.run();

            if (isPostgres) {
                syncPostgresSequences();
            }

            long skillCount = queryCount("skill");
            long skillAliasCount = queryCount("skill_alias");
            long roleCount = queryCount("role");
            long districtCount = queryCount("district");
            long jobPostingCount = queryCount("job_posting");
            long postingSkillCount = queryCount("posting_skill");
            long courseCount = queryCount("course");
            long courseSkillCount = queryCount("course_skill");
            long courseRoleCount = queryCount("course_role");
            long courseOfferingCount = queryCount("course_offering");
            long placementOutcomeCount = queryCount("placement_outcome");
            long employerValidationCount = queryCount("employer_validation");
            long demandMonthlyCount = queryCount("demand_monthly");
            long trainingPlanCount = queryCount("training_plan");

            log.info("Seeded row counts for all 14 tables: skill={}, skill_alias={}, role={}, district={}, job_posting={}, posting_skill={}, course={}, course_skill={}, course_role={}, course_offering={}, placement_outcome={}, employer_validation={}, demand_monthly={}, training_plan={}",
                skillCount, skillAliasCount, roleCount, districtCount, jobPostingCount, postingSkillCount,
                courseCount, courseSkillCount, courseRoleCount, courseOfferingCount, placementOutcomeCount,
                employerValidationCount, demandMonthlyCount, trainingPlanCount
            );

            log.info("Synthetic reference data seeding completed successfully.");
            if (oversupplyService != null) {
                oversupplyService.clearCache();
                try {
                    oversupplyService.warmUp();
                } catch (Throwable t) {
                    log.warn("Flags cache warm-up failed, continuing startup without warm cache: {}", t.getMessage());
                }
            }
            seedStatus.setPhase(SeedStatus.PHASE_READY);
        } catch (Throwable t) {
            log.error("Synthetic data seeding failed", t);
            seedStatus.setPhase(SeedStatus.PHASE_FAILED);
            if (oversupplyService != null) {
                oversupplyService.clearCache();
            }
        }
    }

    private void syncPostgresSequences() {
        java.util.List<String> identityTables = java.util.List.of(
            "skill", "role", "district", "job_posting", "course",
            "employer_validation", "training_plan"
        );
        for (String table : identityTables) {
            try {
                String sql = String.format(
                    "SELECT setval(pg_get_serial_sequence('%s', 'id'), GREATEST(COALESCE(MAX(id), 0), 1), (MAX(id) IS NOT NULL)) FROM %s",
                    table, table
                );
                jdbcTemplate.queryForObject(sql, Long.class);
                log.debug("Synchronized identity sequence for table: {}", table);
            } catch (Exception e) {
                log.warn("Could not synchronize identity sequence for table {}: {}", table, e.getMessage());
            }
        }
        log.info("PostgreSQL identity sequences synchronized for explicit ID tables.");
    }

    /**
     * Safe population check: Verifies all key tables are populated to expected thresholds.
     * Prevents an aborted seed run from falsely masquerading as a complete dataset on persistent databases.
     * For in-memory H2 (used in dev and tests with small synthetic slices), any existing data is respected.
     */
    private boolean isDatabasePopulated(boolean isH2Mem) {
        if (isH2Mem) {
            return queryCount("job_posting") > 0 || queryCount("demand_monthly") > 0;
        }
        return queryCount("job_posting") >= 40000
            && queryCount("posting_skill") >= 284000
            && queryCount("demand_monthly") >= 128000
            && queryCount("course") >= 24
            && queryCount("course_offering") >= 190;
    }

    private long queryCount(String tableName) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Long.class);
        return count != null ? count : 0L;
    }
}
