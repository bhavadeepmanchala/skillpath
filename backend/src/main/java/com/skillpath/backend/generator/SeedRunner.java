package com.skillpath.backend.generator;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public SeedRunner(
        DataGenerator dataGenerator,
        CourseGenerator courseGenerator,
        DataSource dataSource,
        JdbcTemplate jdbcTemplate
    ) {
        this.dataGenerator = dataGenerator;
        this.courseGenerator = courseGenerator;
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        String productName = "Unknown";
        boolean isH2Mem = false;

        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            productName = metaData.getDatabaseProductName();
            String url = metaData.getURL();
            if (productName != null && productName.equalsIgnoreCase("H2") && url != null && url.contains(":mem:")) {
                isH2Mem = true;
            }
        }

        log.info("Running synthetic data seed against database product: {}", productName);

        if (isH2Mem) {
            log.warn("================================================================================");
            log.warn("WARNING: The active datasource is an in-memory H2 database!");
            log.warn("Seeded data will disappear as soon as the application process terminates.");
            log.warn("================================================================================");
        }

        dataGenerator.run();
        courseGenerator.run();

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
    }

    private long queryCount(String tableName) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Long.class);
        return count != null ? count : 0L;
    }
}
