package fr.se2eend.backend.logging;

import jakarta.servlet.*;
import org.slf4j.MDC;

import java.io.IOException;
import java.util.UUID;

public class CorrelationIdFilter implements Filter {
    public static final String CORRELATION_ID = "correlationId";

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        String id = UUID.randomUUID().toString();
        MDC.put(CORRELATION_ID, id);
        try { chain.doFilter(req, res); }
        finally { MDC.remove(CORRELATION_ID); }
    }
}
