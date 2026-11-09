package com.skillpath.backend.generator;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public final class RoleCatalog {

    public record RoleDef(String name, String sector) {}

    private static final List<RoleDef> ALL_ROLES = List.of(
        // IT & Software (3)
        new RoleDef("Software Engineer", Sectors.IT_AND_SOFTWARE),
        new RoleDef("Data Scientist", Sectors.IT_AND_SOFTWARE),
        new RoleDef("DevOps Engineer", Sectors.IT_AND_SOFTWARE),

        // Electronics & Electrical (2)
        new RoleDef("Embedded Systems Engineer", Sectors.ELECTRONICS_AND_ELECTRICAL),
        new RoleDef("Electrical Maintenance Technician", Sectors.ELECTRONICS_AND_ELECTRICAL),

        // Manufacturing & Automotive (3)
        new RoleDef("CNC Machine Operator", Sectors.MANUFACTURING_AND_AUTOMOTIVE),
        new RoleDef("Quality Control Inspector", Sectors.MANUFACTURING_AND_AUTOMOTIVE),
        new RoleDef("Production Engineer", Sectors.MANUFACTURING_AND_AUTOMOTIVE),

        // Healthcare (2)
        new RoleDef("General Duty Medical Assistant", Sectors.HEALTHCARE),
        new RoleDef("Phlebotomy Technician", Sectors.HEALTHCARE),

        // Retail & E-commerce (2)
        new RoleDef("Retail Store Executive", Sectors.RETAIL_AND_ECOMMERCE),
        new RoleDef("Digital Sales Specialist", Sectors.RETAIL_AND_ECOMMERCE),

        // Banking & Finance (3)
        new RoleDef("Accounts Executive", Sectors.BANKING_AND_FINANCE),
        new RoleDef("Financial Analyst", Sectors.BANKING_AND_FINANCE),
        new RoleDef("Loan Processing Officer", Sectors.BANKING_AND_FINANCE),

        // Logistics (3)
        new RoleDef("Warehouse Supervisor", Sectors.LOGISTICS),
        new RoleDef("Logistics Coordinator", Sectors.LOGISTICS),
        new RoleDef("Supply Chain Associate", Sectors.LOGISTICS)
    );

    private static final Map<String, RoleDef> BY_NAME_MAP;

    static {
        Map<String, RoleDef> map = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (RoleDef def : ALL_ROLES) {
            map.put(def.name(), def);
        }
        BY_NAME_MAP = Collections.unmodifiableMap(map);
    }

    private RoleCatalog() {}

    public static List<RoleDef> all() {
        return ALL_ROLES;
    }

    public static RoleDef byName(String name) {
        if (name == null) {
            throw new IllegalArgumentException("Role name must not be null");
        }
        RoleDef def = BY_NAME_MAP.get(name);
        if (def == null) {
            throw new IllegalArgumentException("Unknown role name: '" + name + "'");
        }
        return def;
    }
}
