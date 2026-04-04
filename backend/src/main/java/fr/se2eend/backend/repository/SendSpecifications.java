package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.Send;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class SendSpecifications {

    private SendSpecifications() {}

    public static Specification<Send> ownerContains(String search) {
        return (root, query, cb) -> {
            String pattern = "%" + search.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("ownerEmail")), pattern),
                    cb.like(cb.lower(root.get("ownerName")), pattern)
            );
        };
    }

    public static Specification<Send> withStatus(String status, LocalDateTime now) {
        return (root, query, cb) -> {
            Predicate notRevoked = cb.equal(root.get("revoked"), false);
            Predicate expiresAtNull = cb.isNull(root.get("expiresAt"));
            Predicate notExpired = cb.or(expiresAtNull, cb.greaterThan(root.get("expiresAt"), now));
            Predicate isExpired = cb.and(cb.isNotNull(root.get("expiresAt")), cb.lessThan(root.get("expiresAt"), now));
            Predicate exhausted = cb.greaterThanOrEqualTo(root.get("downloadCount"), root.get("maxDownloads"));
            Predicate notExhausted = cb.lessThan(root.get("downloadCount"), root.get("maxDownloads"));

            return switch (status) {
                case "active"    -> cb.and(notRevoked, notExpired, notExhausted);
                case "expired"   -> cb.and(notRevoked, isExpired);
                case "revoked"   -> cb.equal(root.get("revoked"), true);
                case "exhausted" -> cb.and(notRevoked, notExpired, exhausted);
                default          -> cb.conjunction();
            };
        };
    }
}
