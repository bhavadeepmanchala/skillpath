package com.skillpath.backend.generator;

import java.util.Collections;
import java.util.List;

public final class DistrictCatalog {

    public record DistrictDef(String name, String state) {}

    private static final List<DistrictDef> ALL_DISTRICTS = List.of(
        // Karnataka (4)
        new DistrictDef("Bengaluru Urban", "Karnataka"),
        new DistrictDef("Mysuru", "Karnataka"),
        new DistrictDef("Dharwad", "Karnataka"),
        new DistrictDef("Dakshina Kannada", "Karnataka"),

        // Maharashtra (4)
        new DistrictDef("Pune", "Maharashtra"),
        new DistrictDef("Nagpur", "Maharashtra"),
        new DistrictDef("Nashik", "Maharashtra"),
        new DistrictDef("Gadchiroli", "Maharashtra"),

        // Tamil Nadu (3)
        new DistrictDef("Chennai", "Tamil Nadu"),
        new DistrictDef("Coimbatore", "Tamil Nadu"),
        new DistrictDef("Madurai", "Tamil Nadu"),

        // Telangana (3)
        new DistrictDef("Hyderabad", "Telangana"),
        new DistrictDef("Warangal", "Telangana"),
        new DistrictDef("Medchal-Malkajgiri", "Telangana"),

        // Gujarat (3)
        new DistrictDef("Ahmedabad", "Gujarat"),
        new DistrictDef("Surat", "Gujarat"),
        new DistrictDef("Vadodara", "Gujarat"),

        // Uttar Pradesh (3)
        new DistrictDef("Gautam Buddha Nagar", "Uttar Pradesh"),
        new DistrictDef("Lucknow", "Uttar Pradesh"),
        new DistrictDef("Varanasi", "Uttar Pradesh"),

        // Rajasthan (3)
        new DistrictDef("Jaipur", "Rajasthan"),
        new DistrictDef("Jodhpur", "Rajasthan"),
        new DistrictDef("Udaipur", "Rajasthan"),

        // Madhya Pradesh (3)
        new DistrictDef("Indore", "Madhya Pradesh"),
        new DistrictDef("Bhopal", "Madhya Pradesh"),
        new DistrictDef("Jabalpur", "Madhya Pradesh"),

        // Kerala (3)
        new DistrictDef("Ernakulam", "Kerala"),
        new DistrictDef("Thiruvananthapuram", "Kerala"),
        new DistrictDef("Kozhikode", "Kerala"),

        // West Bengal (2)
        new DistrictDef("Kolkata", "West Bengal"),
        new DistrictDef("North 24 Parganas", "West Bengal"),

        // Haryana (2)
        new DistrictDef("Gurugram", "Haryana"),
        new DistrictDef("Faridabad", "Haryana"),

        // Bihar (2)
        new DistrictDef("Patna", "Bihar"),
        new DistrictDef("Araria", "Bihar"),

        // Jharkhand (1)
        new DistrictDef("Ranchi", "Jharkhand"),

        // Odisha (2)
        new DistrictDef("Khordha", "Odisha"),
        new DistrictDef("Koraput", "Odisha"),

        // Assam (1)
        new DistrictDef("Kamrup Metropolitan", "Assam"),

        // Andhra Pradesh (1)
        new DistrictDef("Visakhapatnam", "Andhra Pradesh")
    );

    private DistrictCatalog() {}

    public static List<DistrictDef> all() {
        return ALL_DISTRICTS;
    }
}