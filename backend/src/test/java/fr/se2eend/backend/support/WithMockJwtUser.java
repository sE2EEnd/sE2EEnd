package fr.se2eend.backend.support;

import org.springframework.security.test.context.support.WithSecurityContext;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Sets up a mock JWT-based security context for tests that call services
 * which extract claims from a JwtAuthenticationToken (sub, preferred_username, email).
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockJwtUserFactory.class)
public @interface WithMockJwtUser {
    String sub()      default "00000000-0000-0000-0000-000000000001";
    String username() default "testuser";
    String email()    default "test@example.com";
    String[] roles()  default {};
}