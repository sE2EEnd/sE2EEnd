package fr.se2eend.backend.config;

import fr.se2eend.backend.logging.CorrelationIdFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig {

    @Bean
    public FilterRegistrationBean<CorrelationIdFilter> correlationIdFilter() {
        FilterRegistrationBean<CorrelationIdFilter> bean =
                new FilterRegistrationBean<>(new CorrelationIdFilter());
        bean.setOrder(1);
        return bean;
    }
}