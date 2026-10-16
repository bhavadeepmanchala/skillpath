package com.skillpath.backend.generator;

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

    private final JdbcTemplate jdbcTemplate;

    public DataGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
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
     * Loads reference data into the database in ONE transaction.
     * If any reference table (skill, skill_alias, role, district) is non-empty,
     * throws {@link IllegalStateException}.
     */
    @Transactional
    public void run() {
        long skillCount = queryRowCount("skill");
        long aliasCount = queryRowCount("skill_alias");
        long roleCount = queryRowCount("role");
        long districtCount = queryRowCount("district");

        if (skillCount > 0 || aliasCount > 0 || roleCount > 0 || districtCount > 0) {
            throw new IllegalStateException(String.format(
                "Database reference tables are not empty (skill: %d, skill_alias: %d, role: %d, district: %d). "
                    + "Clear the database before running data generator.",
                skillCount, aliasCount, roleCount, districtCount
            ));
        }

        ReferenceData data = generateReferenceData();

        // 1. skill
        jdbcTemplate.batchUpdate(
            "INSERT INTO skill (id, name, category, active) VALUES (?, ?, ?, ?)",
            data.skills(),
            data.skills().size(),
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
            data.aliases(),
            data.aliases().size(),
            (ps, a) -> {
                ps.setLong(1, a.skillId());
                ps.setString(2, a.alias());
            }
        );

        // 3. role
        jdbcTemplate.batchUpdate(
            "INSERT INTO role (id, name, sector) VALUES (?, ?, ?)",
            data.roles(),
            data.roles().size(),
            (ps, r) -> {
                ps.setLong(1, r.id());
                ps.setString(2, r.name());
                ps.setString(3, r.sector());
            }
        );

        // 4. district
        jdbcTemplate.batchUpdate(
            "INSERT INTO district (id, name, state) VALUES (?, ?, ?)",
            data.districts(),
            data.districts().size(),
            (ps, d) -> {
                ps.setLong(1, d.id());
                ps.setString(2, d.name());
                ps.setString(3, d.state());
            }
        );

        log.info("Seeded reference tables: {} skills, {} skill aliases, {} roles, {} districts",
            data.skills().size(), data.aliases().size(), data.roles().size(), data.districts().size());
    }

    private long queryRowCount(String tableName) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Long.class);
        return count != null ? count : 0L;
    }
}
