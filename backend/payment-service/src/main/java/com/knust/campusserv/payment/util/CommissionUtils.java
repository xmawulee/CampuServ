package com.knust.campusserv.payment.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utility for calculating platform commissions.
 */
public class CommissionUtils {

    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.05");

    /**
     * Calculates the flat 5% platform commission using HALF_UP rounding to 2 decimal places.
     *
     * @param amount The base amount to compute commission on.
     * @return The platform commission fee.
     */
    public static BigDecimal calculateCommission(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amount.multiply(COMMISSION_RATE).setScale(2, RoundingMode.HALF_UP);
    }
}
