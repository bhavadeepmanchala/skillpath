package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.skillpath.backend.service.SeedStatus;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;

class SeedRunnerTest {

    private DataGenerator dataGenerator;
    private CourseGenerator courseGenerator;
    private DataSource dataSource;
    private JdbcTemplate jdbcTemplate;
    private SeedStatus seedStatus;
    private SeedRunner seedRunner;

    @BeforeEach
    void setUp() throws Exception {
        dataGenerator = mock(DataGenerator.class);
        courseGenerator = mock(CourseGenerator.class);
        dataSource = mock(DataSource.class);
        jdbcTemplate = mock(JdbcTemplate.class);

        Connection connection = mock(Connection.class);
        DatabaseMetaData metaData = mock(DatabaseMetaData.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metaData);
        when(metaData.getDatabaseProductName()).thenReturn("H2");
        when(metaData.getURL()).thenReturn("jdbc:h2:mem:skillpath");

        seedStatus = new SeedStatus(true, SeedStatus.PHASE_SEEDING);
        seedRunner = new SeedRunner(dataGenerator, courseGenerator, dataSource, jdbcTemplate, seedStatus);
    }

    @Test
    void seedStatusInitialState_seedingBeforeExecution() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("seed");
        SeedStatus status = new SeedStatus(env);

        assertThat(status.isSeedProfileActive()).isTrue();
        assertThat(status.getPhase()).isEqualTo(SeedStatus.PHASE_SEEDING);
    }

    @Test
    void seedStatusInitialState_emptyWhenNoSeedProfile() {
        MockEnvironment env = new MockEnvironment();
        SeedStatus status = new SeedStatus(env);

        assertThat(status.isSeedProfileActive()).isFalse();
        assertThat(status.getPhase()).isEqualTo(SeedStatus.PHASE_EMPTY);
    }

    @Test
    void whenTablesNotEmpty_skipsSeedingAndSetsReady() throws Exception {
        when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM job_posting"), eq(Long.class))).thenReturn(40000L);

        seedRunner.run(new DefaultApplicationArguments());

        verify(dataGenerator, never()).run();
        verify(courseGenerator, never()).run();
        assertThat(seedStatus.getPhase()).isEqualTo(SeedStatus.PHASE_READY);
    }

    @Test
    void whenTablesEmpty_runsGeneratorsAndSetsReady() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(0L);

        seedRunner.run(new DefaultApplicationArguments());

        verify(dataGenerator).run();
        verify(courseGenerator).run();
        assertThat(seedStatus.getPhase()).isEqualTo(SeedStatus.PHASE_READY);
    }

    @Test
    void whenSeedingThrowsException_catchesAndSetsFailed() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(0L);
        doThrow(new RuntimeException("Simulated seed failure")).when(dataGenerator).run();

        seedRunner.run(new DefaultApplicationArguments());

        assertThat(seedStatus.getPhase()).isEqualTo(SeedStatus.PHASE_FAILED);
    }
}

