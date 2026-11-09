package com.skillpath.backend.generator;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowCallbackHandler;

public final class DatasetChecksum {

    private static final String COLUMN_DELIMITER = "|";
    private static final String NULL_SENTINEL = "\u0000<NULL>\u0000";

    private DatasetChecksum() {}

    public static String calculate(JdbcTemplate jdbcTemplate, List<String> tableNames) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            for (String tableName : tableNames) {
                Integer columnCountObj = jdbcTemplate.query(
                    "SELECT * FROM " + tableName + " WHERE 1=0",
                    (ResultSetExtractor<Integer>) rs -> rs.getMetaData().getColumnCount()
                );
                int columnCount = columnCountObj != null ? columnCountObj : 0;

                StringBuilder sql = new StringBuilder("SELECT * FROM ").append(tableName).append(" ORDER BY ");
                for (int i = 1; i <= columnCount; i++) {
                    if (i > 1) {
                        sql.append(", ");
                    }
                    sql.append(i);
                }

                String tableHeader = "TABLE:" + tableName + "\n";
                digest.update(tableHeader.getBytes(StandardCharsets.UTF_8));

                jdbcTemplate.query(sql.toString(), (RowCallbackHandler) rs -> {
                    StringBuilder rowBuilder = new StringBuilder();
                    for (int col = 1; col <= columnCount; col++) {
                        if (col > 1) {
                            rowBuilder.append(COLUMN_DELIMITER);
                        }
                        Object value = rs.getObject(col);
                        if (value == null) {
                            rowBuilder.append(NULL_SENTINEL);
                        } else {
                            rowBuilder.append(value);
                        }
                    }
                    rowBuilder.append("\n");
                    digest.update(rowBuilder.toString().getBytes(StandardCharsets.UTF_8));
                });
            }

            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
