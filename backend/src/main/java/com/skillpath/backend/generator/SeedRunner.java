package com.skillpath.backend.generator;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("seed")
public class SeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);

    private final DataGenerator dataGenerator;
    private final CourseGenerator courseGenerator;
    private final DataSource dataSource;

    public SeedRunner(DataGenerator dataGenerator, CourseGenerator courseGenerator, DataSource dataSource) {
        this.dataGenerator = dataGenerator;
        this.courseGenerator = courseGenerator;
        this.dataSource = dataSource;
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
        log.info("Synthetic reference data seeding completed successfully.");
    }
}
