package com.knust.campusserv.request;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DbCleanup {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5433/campusserv";
        String user = "postgres";
        String password = "postgres";
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            System.out.println("Connected to database. Deleting orphan attachments...");
            int rows = stmt.executeUpdate("DELETE FROM request_attachments WHERE request_id NOT IN (SELECT id FROM requests)");
            System.out.println("Successfully deleted " + rows + " orphan request attachments.");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
