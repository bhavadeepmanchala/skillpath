package com.skillpath.backend.generator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Synthetic profile mappings for all 40 districts: tier classification (1=metro/hub, 2=regional hub, 3=small)
 * and 2-3 strong industry sectors.
 * Tier volume weights are 6 : 3 : 1. Sector affinity is x4 for strong sectors and x1 otherwise.
 * All profiles are synthetic and illustrative design choices.
 */
public final class DistrictProfiles {

    public record DistrictProfile(
        String districtName,
        int tier,
        List<String> strongSectors
    ) {
        public double tierWeight() {
            return switch (tier) {
                case 1 -> 6.0;
                case 2 -> 3.0;
                case 3 -> 1.0;
                default -> throw new IllegalStateException("Unexpected tier: " + tier);
            };
        }

        public double sectorAffinity(String sector) {
            return strongSectors.contains(sector) ? 4.0 : 1.0;
        }
    }

    private static final List<DistrictProfile> ALL_PROFILES;
    private static final Map<String, DistrictProfile> BY_NAME_MAP;

    static {
        Map<String, DistrictCatalog.DistrictDef> catalogDistricts = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (DistrictCatalog.DistrictDef def : DistrictCatalog.all()) {
            catalogDistricts.put(def.name(), def);
        }

        List<DistrictProfile> profiles = new ArrayList<>();

        // Karnataka (4)
        profiles.add(profile("Bengaluru Urban", 1, List.of(Sectors.IT_AND_SOFTWARE, Sectors.ELECTRONICS_AND_ELECTRICAL, Sectors.BANKING_AND_FINANCE), catalogDistricts));
        profiles.add(profile("Mysuru", 2, List.of(Sectors.IT_AND_SOFTWARE, Sectors.MANUFACTURING_AND_AUTOMOTIVE), catalogDistricts));
        profiles.add(profile("Dharwad", 3, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));
        profiles.add(profile("Dakshina Kannada", 2, List.of(Sectors.BANKING_AND_FINANCE, Sectors.HEALTHCARE, Sectors.LOGISTICS), catalogDistricts));

        // Maharashtra (4)
        profiles.add(profile("Pune", 1, List.of(Sectors.IT_AND_SOFTWARE, Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.ELECTRONICS_AND_ELECTRICAL), catalogDistricts));
        profiles.add(profile("Nagpur", 2, List.of(Sectors.LOGISTICS, Sectors.HEALTHCARE, Sectors.MANUFACTURING_AND_AUTOMOTIVE), catalogDistricts));
        profiles.add(profile("Nashik", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));
        profiles.add(profile("Gadchiroli", 3, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));

        // Tamil Nadu (3)
        profiles.add(profile("Chennai", 1, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.IT_AND_SOFTWARE, Sectors.HEALTHCARE), catalogDistricts));
        profiles.add(profile("Coimbatore", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.ELECTRONICS_AND_ELECTRICAL), catalogDistricts));
        profiles.add(profile("Madurai", 3, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.HEALTHCARE, Sectors.RETAIL_AND_ECOMMERCE), catalogDistricts));

        // Telangana (3)
        profiles.add(profile("Hyderabad", 1, List.of(Sectors.IT_AND_SOFTWARE, Sectors.HEALTHCARE, Sectors.BANKING_AND_FINANCE), catalogDistricts));
        profiles.add(profile("Warangal", 3, List.of(Sectors.HEALTHCARE, Sectors.RETAIL_AND_ECOMMERCE, Sectors.LOGISTICS), catalogDistricts));
        profiles.add(profile("Medchal-Malkajgiri", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));

        // Gujarat (3)
        profiles.add(profile("Ahmedabad", 1, List.of(Sectors.RETAIL_AND_ECOMMERCE, Sectors.BANKING_AND_FINANCE, Sectors.MANUFACTURING_AND_AUTOMOTIVE), catalogDistricts));
        profiles.add(profile("Surat", 2, List.of(Sectors.RETAIL_AND_ECOMMERCE, Sectors.MANUFACTURING_AND_AUTOMOTIVE), catalogDistricts));
        profiles.add(profile("Vadodara", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.ELECTRONICS_AND_ELECTRICAL), catalogDistricts));

        // Uttar Pradesh (3)
        profiles.add(profile("Gautam Buddha Nagar", 1, List.of(Sectors.IT_AND_SOFTWARE, Sectors.ELECTRONICS_AND_ELECTRICAL, Sectors.RETAIL_AND_ECOMMERCE), catalogDistricts));
        profiles.add(profile("Lucknow", 2, List.of(Sectors.HEALTHCARE, Sectors.BANKING_AND_FINANCE, Sectors.RETAIL_AND_ECOMMERCE), catalogDistricts));
        profiles.add(profile("Varanasi", 3, List.of(Sectors.RETAIL_AND_ECOMMERCE, Sectors.LOGISTICS), catalogDistricts));

        // Rajasthan (3)
        profiles.add(profile("Jaipur", 2, List.of(Sectors.RETAIL_AND_ECOMMERCE, Sectors.BANKING_AND_FINANCE, Sectors.HEALTHCARE), catalogDistricts));
        profiles.add(profile("Jodhpur", 3, List.of(Sectors.HEALTHCARE, Sectors.LOGISTICS), catalogDistricts));
        profiles.add(profile("Udaipur", 3, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.RETAIL_AND_ECOMMERCE), catalogDistricts));

        // Madhya Pradesh (3)
        profiles.add(profile("Indore", 2, List.of(Sectors.IT_AND_SOFTWARE, Sectors.BANKING_AND_FINANCE, Sectors.LOGISTICS), catalogDistricts));
        profiles.add(profile("Bhopal", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.HEALTHCARE), catalogDistricts));
        profiles.add(profile("Jabalpur", 3, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));

        // Kerala (3)
        profiles.add(profile("Ernakulam", 2, List.of(Sectors.BANKING_AND_FINANCE, Sectors.LOGISTICS, Sectors.HEALTHCARE), catalogDistricts));
        profiles.add(profile("Thiruvananthapuram", 2, List.of(Sectors.IT_AND_SOFTWARE, Sectors.HEALTHCARE), catalogDistricts));
        profiles.add(profile("Kozhikode", 3, List.of(Sectors.HEALTHCARE, Sectors.RETAIL_AND_ECOMMERCE, Sectors.LOGISTICS), catalogDistricts));

        // West Bengal (2)
        profiles.add(profile("Kolkata", 1, List.of(Sectors.BANKING_AND_FINANCE, Sectors.LOGISTICS, Sectors.IT_AND_SOFTWARE), catalogDistricts));
        profiles.add(profile("North 24 Parganas", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));

        // Haryana (2)
        profiles.add(profile("Gurugram", 1, List.of(Sectors.IT_AND_SOFTWARE, Sectors.BANKING_AND_FINANCE, Sectors.RETAIL_AND_ECOMMERCE), catalogDistricts));
        profiles.add(profile("Faridabad", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.ELECTRONICS_AND_ELECTRICAL), catalogDistricts));

        // Bihar (2)
        profiles.add(profile("Patna", 2, List.of(Sectors.RETAIL_AND_ECOMMERCE, Sectors.HEALTHCARE, Sectors.BANKING_AND_FINANCE), catalogDistricts));
        profiles.add(profile("Araria", 3, List.of(Sectors.RETAIL_AND_ECOMMERCE, Sectors.HEALTHCARE, Sectors.LOGISTICS), catalogDistricts));

        // Jharkhand (1)
        profiles.add(profile("Ranchi", 2, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));

        // Odisha (2)
        profiles.add(profile("Khordha", 2, List.of(Sectors.IT_AND_SOFTWARE, Sectors.HEALTHCARE, Sectors.BANKING_AND_FINANCE), catalogDistricts));
        profiles.add(profile("Koraput", 3, List.of(Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.LOGISTICS), catalogDistricts));

        // Assam (1)
        profiles.add(profile("Kamrup Metropolitan", 2, List.of(Sectors.LOGISTICS, Sectors.RETAIL_AND_ECOMMERCE, Sectors.HEALTHCARE), catalogDistricts));

        // Andhra Pradesh (1)
        profiles.add(profile("Visakhapatnam", 2, List.of(Sectors.LOGISTICS, Sectors.MANUFACTURING_AND_AUTOMOTIVE, Sectors.IT_AND_SOFTWARE), catalogDistricts));

        ALL_PROFILES = Collections.unmodifiableList(profiles);

        Map<String, DistrictProfile> map = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (DistrictProfile p : ALL_PROFILES) {
            map.put(p.districtName(), p);
        }
        BY_NAME_MAP = Collections.unmodifiableMap(map);
    }

    private static DistrictProfile profile(
        String districtName,
        int tier,
        List<String> strongSectors,
        Map<String, DistrictCatalog.DistrictDef> catalogDistricts
    ) {
        DistrictCatalog.DistrictDef catalogDef = catalogDistricts.get(districtName);
        if (catalogDef == null) {
            throw new IllegalArgumentException("Unknown district in catalog: '" + districtName + "'");
        }

        if (tier < 1 || tier > 3) {
            throw new IllegalArgumentException("Tier must be 1, 2, or 3: " + tier);
        }
        if (strongSectors.size() < 2 || strongSectors.size() > 3) {
            throw new IllegalArgumentException("Must have 2-3 strong sectors: " + districtName);
        }
        TreeSet<String> validSectors = new TreeSet<>(Sectors.ALL);
        for (String s : strongSectors) {
            if (!validSectors.contains(s)) {
                throw new IllegalArgumentException("Unknown sector: " + s);
            }
        }

        return new DistrictProfile(catalogDef.name(), tier, List.copyOf(strongSectors));
    }

    private DistrictProfiles() {}

    public static List<DistrictProfile> all() {
        return ALL_PROFILES;
    }

    public static DistrictProfile byName(String districtName) {
        if (districtName == null) {
            throw new IllegalArgumentException("District name must not be null");
        }
        DistrictProfile profile = BY_NAME_MAP.get(districtName);
        if (profile == null) {
            throw new IllegalArgumentException("Unknown district profile: '" + districtName + "'");
        }
        return profile;
    }
}
