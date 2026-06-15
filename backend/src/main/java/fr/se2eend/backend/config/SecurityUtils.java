package fr.se2eend.backend.config;

import fr.se2eend.backend.exception.ResourceNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

/**
 * Helpers around the authenticated principal (Keycloak JWT).
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    /**
     * Current authenticated user's id (the Keycloak {@code sub} claim), or {@code null} if there
     * is no JWT principal or the subject is not a UUID.
     */
    public static UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            try {
                return UUID.fromString(jwt.getSubject());
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Ensure the given owner id belongs to the current authenticated user, otherwise behave as
     * if the resource did not exist (404, not 403) so its existence isn't leaked to a non-owner.
     */
    public static void requireOwner(UUID ownerId) {
        UUID current = currentUserId();
        if (current == null || !current.equals(ownerId)) {
            throw ResourceNotFoundException.sendNotFound();
        }
    }
}
