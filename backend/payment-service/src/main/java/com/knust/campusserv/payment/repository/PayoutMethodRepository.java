package com.knust.campusserv.payment.repository;

import com.knust.campusserv.payment.model.PayoutMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayoutMethodRepository extends JpaRepository<PayoutMethod, String> {
    List<PayoutMethod> findByUserIdOrderByCreatedAtDesc(String userId);
}
