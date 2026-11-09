package com.skillpath.backend.generator;

import java.util.List;

public final class Sectors {

    private Sectors() {}

    public static final String IT_AND_SOFTWARE = "IT & Software";
    public static final String ELECTRONICS_AND_ELECTRICAL = "Electronics & Electrical";
    public static final String MANUFACTURING_AND_AUTOMOTIVE = "Manufacturing & Automotive";
    public static final String HEALTHCARE = "Healthcare";
    public static final String RETAIL_AND_ECOMMERCE = "Retail & E-commerce";
    public static final String BANKING_AND_FINANCE = "Banking & Finance";
    public static final String LOGISTICS = "Logistics";

    public static final List<String> ALL = List.of(
        IT_AND_SOFTWARE,
        ELECTRONICS_AND_ELECTRICAL,
        MANUFACTURING_AND_AUTOMOTIVE,
        HEALTHCARE,
        RETAIL_AND_ECOMMERCE,
        BANKING_AND_FINANCE,
        LOGISTICS
    );
}
