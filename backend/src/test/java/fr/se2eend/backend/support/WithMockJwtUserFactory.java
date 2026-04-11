package fr.se2eend.backend.support;

import org.jspecify.annotations.NonNull;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

public class WithMockJwtUserFactory implements WithSecurityContextFactory<WithMockJwtUser> {

    @Override
    @NonNull
    public SecurityContext createSecurityContext(@NonNull WithMockJwtUser annotation) {
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .claim("sub", annotation.sub())
                .claim("preferred_username", annotation.username())
                .claim("email", annotation.email())
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        List<SimpleGrantedAuthority> authorities = Arrays.stream(annotation.roles())
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .toList();

        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, authorities);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        return context;
    }
}