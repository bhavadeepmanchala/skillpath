package com.skillpath.backend.generator;

import java.sql.Date;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataGenerator {

    private static final Logger log = LoggerFactory.getLogger(DataGenerator.class);
    private static final int BATCH_SIZE = 5000;

    private final JdbcTemplate jdbcTemplate;
    private final GeneratorProperties properties;
    private final PostingGenerator postingGenerator;
    private final DemandMonthlyRebuilder demandMonthlyRebuilder;

    @org.springframework.beans.factory.annotation.Autowired
    public DataGenerator(
        JdbcTemplate jdbcTemplate,
        GeneratorProperties properties,
        PostingGenerator postingGenerator,
        DemandMonthlyRebuilder demandMonthlyRebuilder
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
        this.postingGenerator = postingGenerator;
        this.demandMonthlyRebuilder = demandMonthlyRebuilder;
    }

    public DataGenerator(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, new GeneratorProperties(), new PostingGenerator(), new DemandMonthlyRebuilder(jdbcTemplate));
    }

    /**
     * Pure reference data generation. Builds structured in-memory records
     * with explicit sequential IDs starting at 1 in catalog order without database interaction.
     *
     * @return populated {@link ReferenceData} snapshot
     */
    public ReferenceData generateReferenceData() {
        List<SkillCatalog.SkillDef> skillDefs = SkillCatalog.all();
        List<ReferenceData.SkillRow> skillRows = new ArrayList<>(skillDefs.size());
        List<ReferenceData.SkillAliasRow> aliasRows = new ArrayList<>();

        long skillId = 1;
        for (SkillCatalog.SkillDef def : skillDefs) {
            skillRows.add(new ReferenceData.SkillRow(skillId, def.name(), def.category(), true));
            for (String alias : def.aliases()) {
                aliasRows.add(new ReferenceData.SkillAliasRow(skillId, alias));
            }
            skillId++;
        }

        List<RoleCatalog.RoleDef> roleDefs = RoleCatalog.all();
        List<ReferenceData.RoleRow> roleRows = new ArrayList<>(roleDefs.size());
        long roleId = 1;
        for (RoleCatalog.RoleDef def : roleDefs) {
            roleRows.add(new ReferenceData.RoleRow(roleId, def.name(), def.sector()));
            roleId++;
        }

        List<DistrictCatalog.DistrictDef> districtDefs = DistrictCatalog.all();
        List<ReferenceData.DistrictRow> districtRows = new ArrayList<>(districtDefs.size());
        long districtId = 1;
        for (DistrictCatalog.DistrictDef def : districtDefs) {
            districtRows.add(new ReferenceData.DistrictRow(districtId, def.name(), def.state()));
            districtId++;
        }

        return new ReferenceData(
            Collections.unmodifiableList(skillRows),
            Collections.unmodifiableList(aliasRows),
            Collections.unmodifiableList(roleRows),
            Collections.unmodifiableList(districtRows)
        );
    }

    /**
     * Pure dataset generation including reference data and synthetic job postings.
     *
     * @param seed master seed for deterministic random generation
     * @return complete {@link GeneratedDataset} snapshot
     */
    public GeneratedDataset generate(long seed) {
        ReferenceData refData = generateReferenceData();
        PostingData postingData = postingGenerator.generate(refData, seed, properties);
        return new GeneratedDataset(refData, postingData);
    }

    /**
     * Loads reference data and synthetic postings into the database in ONE transaction,
     * then rebuilds demand_monthly aggregates.
     * Delegates to {@link #run(long)} using configured properties seed.
     */
    @Transactional
    public void run() {
        run(properties.getSeed());
    }

    /**
     * Loads reference data and synthetic postings into the database in ONE transaction using
     * the specified seed, then rebuilds demand_monthly.
     * If any of the 7 owned tables is non-empty, throws {@link IllegalStateException}.
     *
     * @param seed master seed for generation
     */
    @Transactional
    public void run(long seed) {
        long skillCount = queryRowCount("skill");
        long aliasCount = queryRowCount("skill_alias");
        long roleCount = queryRowCount("role");
        long districtCount = queryRowCount("district");
        long postingCount = queryRowCount("job_posting");
        long postingSkillCount = queryRowCount("posting_skill");
        long demandMonthlyCount = queryRowCount("demand_monthly");

        if (skillCount > 0 || aliasCount > 0 || roleCount > 0 || districtCount > 0
                || postingCount > 0 || postingSkillCount > 0 || demandMonthlyCount > 0) {
            throw new IllegalStateException(String.format(
                "Database reference or posting tables are not empty "
                    + "(skill: %d, skill_alias: %d, role: %d, district: %d, job_posting: %d, posting_skill: %d, demand_monthly: %d). "
                    + "Clear the database before running data generator.",
                skillCount, aliasCount, roleCount, districtCount,
                postingCount, postingSkillCount, demandMonthlyCount
            ));
        }

        GeneratedDataset dataset = generate(seed);
        ReferenceData refData = dataset.referenceData();
        PostingData postingData = dataset.postingData();

        // 1. skill
        jdbcTemplate.batchUpdate(
            "INSERT INTO skill (id, name, category, active) VALUES (?, ?, ?, ?)",
            refData.skills(),
            BATCH_SIZE,
            (ps, s) -> {
                ps.setLong(1, s.id());
                ps.setString(2, s.name());
                ps.setString(3, s.category());
                ps.setBoolean(4, s.active());
            }
        );

        // 2. skill_alias
        jdbcTemplate.batchUpdate(
            "INSERT INTO skill_alias (skill_id, alias) VALUES (?, ?)",
            refData.aliases(),
            BATCH_SIZE,
            (ps, a) -> {
                ps.setLong(1, a.skillId());
                ps.setString(2, a.alias());
            }
        );

        // 3. role
        jdbcTemplate.batchUpdate(
            "INSERT INTO role (id, name, sector) VALUES (?, ?, ?)",
            refData.roles(),
            BATCH_SIZE,
            (ps, r) -> {
                ps.setLong(1, r.id());
                ps.setString(2, r.name());
                ps.setString(3, r.sector());
            }
        );

        // 4. district
        jdbcTemplate.batchUpdate(
            "INSERT INTO district (id, name, state) VALUES (?, ?, ?)",
            refData.districts(),
            BATCH_SIZE,
            (ps, d) -> {
                ps.setLong(1, d.id());
                ps.setString(2, d.name());
                ps.setString(3, d.state());
            }
        );

        // 5. job_posting
        jdbcTemplate.batchUpdate(
            "INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, ?, ?, ?, ?)",
            postingData.postings(),
            BATCH_SIZE,
            (ps, p) -> {
                ps.setLong(1, p.id());
                ps.setLong(2, p.roleId());
                ps.setLong(3, p.districtId());
                ps.setDate(4, Date.valueOf(p.postedOn()));
                ps.setString(5, p.level());
            }
        );

        // 6. posting_skill
        jdbcTemplate.batchUpdate(
            "INSERT INTO posting_skill (posting_id, skill_id, required_level) VALUES (?, ?, ?)",
            postingData.postingSkills(),
            BATCH_SIZE,
            (ps, s) -> {
                ps.setLong(1, s.postingId());
                ps.setLong(2, s.skillId());
                ps.setString(3, s.requiredLevel());
            }
        );

        // 7. demand_monthly rebuild
        demandMonthlyRebuilder.rebuild();

        log.info("Seeded 7 generator tables: skill={}, skill_alias={}, role={}, district={}, job_posting={}, posting_skill={}, demand_monthly={}",
            queryRowCount("skill"),
            queryRowCount("skill_alias"),
            queryRowCount("role"),
            queryRowCount("district"),
            queryRowCount("job_posting"),
            queryRowCount("posting_skill"),
            queryRowCount("demand_monthly")
        );
    }

    private long queryRowCount(String tableName) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Long.class);
        return count != null ? count : 0L;
    }
}
