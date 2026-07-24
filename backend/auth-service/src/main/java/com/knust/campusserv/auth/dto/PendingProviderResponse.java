package com.knust.campusserv.auth.dto;

import com.knust.campusserv.auth.model.User;
import java.util.List;

public class PendingProviderResponse {
    private User user;
    private List<String> duplicateAccounts; // list of user emails that share the same ID photo hash

    public PendingProviderResponse() {
    }

    public PendingProviderResponse(User user, List<String> duplicateAccounts) {
        this.user = user;
        this.duplicateAccounts = duplicateAccounts;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public List<String> getDuplicateAccounts() {
        return duplicateAccounts;
    }

    public void setDuplicateAccounts(List<String> duplicateAccounts) {
        this.duplicateAccounts = duplicateAccounts;
    }
}
