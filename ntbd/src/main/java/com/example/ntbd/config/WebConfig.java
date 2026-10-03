package com.example.ntbd.config;

import com.example.ntbd.auth.ApplicationActivity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@RequiredArgsConstructor
@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Optional: controller slice tests (@WebMvcTest) run without it
    private final ObjectProvider<ApplicationActivity> applicationActivity;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        applicationActivity.ifAvailable(activity -> registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
                activity.requestCompleted(request, response, ex);
            }
        }).addPathPatterns("/api/**"));
    }
}
