package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.skillpath.backend.service.ReadinessService;
import com.skillpath.backend.service.SeedStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
class ReadinessControllerTest {

    @Autowired
    private ReadinessController autowiredReadinessController;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        cleanTables();
    }

    @AfterEach
    void tearDown() {
        cleanTables();
    }

    private void cleanTables() {
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM posting_skill");
        jdbcTemplate.execute("DELETE FROM course_offering");
        jdbcTemplate.execute("DELETE FROM placement_outcome");
        jdbcTemplate.execute("DELETE FROM course_role");
        jdbcTemplate.execute("DELETE FROM course_skill");
        jdbcTemplate.execute("DELETE FROM course");
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM job_posting");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    private void insertDemandMonthlyRow() {
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'Test District', 'State')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Test Role', 'IT')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (1, 'Java', 'Programming', true)");
        jdbcTemplate.execute(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) "
                + "VALUES (1, 1, 1, '2026-09', 10, 20)"
        );
    }

    @Test
    void seedProfileSeeding_returnsReadyFalsePhaseSeedingSyntheticTrue() throws Exception {
        SeedStatus seedStatus = new SeedStatus(true, SeedStatus.PHASE_SEEDING);
        ReadinessService service = new ReadinessService(seedStatus, jdbcTemplate);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ReadinessController(service)).build();

        mockMvc.perform(get("/api/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(false)))
            .andExpect(jsonPath("$.phase", is("seeding")))
            .andExpect(jsonPath("$.synthetic", is(true)));
    }

    @Test
    void seedProfileReady_returnsReadyTruePhaseReadySyntheticTrue() throws Exception {
        SeedStatus seedStatus = new SeedStatus(true, SeedStatus.PHASE_READY);
        ReadinessService service = new ReadinessService(seedStatus, jdbcTemplate);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ReadinessController(service)).build();

        mockMvc.perform(get("/api/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(true)))
            .andExpect(jsonPath("$.phase", is("ready")))
            .andExpect(jsonPath("$.synthetic", is(true)));
    }

    @Test
    void seedProfileFailed_returnsReadyFalsePhaseFailedSyntheticTrue() throws Exception {
        SeedStatus seedStatus = new SeedStatus(true, SeedStatus.PHASE_FAILED);
        ReadinessService service = new ReadinessService(seedStatus, jdbcTemplate);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ReadinessController(service)).build();

        mockMvc.perform(get("/api/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(false)))
            .andExpect(jsonPath("$.phase", is("failed")))
            .andExpect(jsonPath("$.synthetic", is(true)));
    }

    @Test
    void noSeedProfileWithDemandMonthlyRows_returnsReadyTruePhaseReadySyntheticFalse() throws Exception {
        insertDemandMonthlyRow();

        SeedStatus seedStatus = new SeedStatus(false, SeedStatus.PHASE_EMPTY);
        ReadinessService service = new ReadinessService(seedStatus, jdbcTemplate);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ReadinessController(service)).build();

        mockMvc.perform(get("/api/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(true)))
            .andExpect(jsonPath("$.phase", is("ready")))
            .andExpect(jsonPath("$.synthetic", is(false)));
    }

    @Test
    void noSeedProfileWithEmptyDemandMonthly_returnsReadyFalsePhaseEmptySyntheticFalse() throws Exception {
        SeedStatus seedStatus = new SeedStatus(false, SeedStatus.PHASE_EMPTY);
        ReadinessService service = new ReadinessService(seedStatus, jdbcTemplate);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ReadinessController(service)).build();

        mockMvc.perform(get("/api/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(false)))
            .andExpect(jsonPath("$.phase", is("empty")))
            .andExpect(jsonPath("$.synthetic", is(false)));
    }

    @Test
    void autowiredController_integratesWithSpringContext() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(autowiredReadinessController).build();

        // Initially demand_monthly is empty and test context does not have seed profile active
        mockMvc.perform(get("/api/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(false)))
            .andExpect(jsonPath("$.phase", is("empty")))
            .andExpect(jsonPath("$.synthetic", is(false)));

        insertDemandMonthlyRow();

        mockMvc.perform(get("/api/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ready", is(true)))
            .andExpect(jsonPath("$.phase", is("ready")))
            .andExpect(jsonPath("$.synthetic", is(false)));
    }
}
