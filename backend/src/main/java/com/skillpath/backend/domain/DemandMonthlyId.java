package com.skillpath.backend.domain;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemandMonthlyId implements Serializable {
    private Long districtId;
    private Long roleId;
    private Long skillId;
    private String month;
}
