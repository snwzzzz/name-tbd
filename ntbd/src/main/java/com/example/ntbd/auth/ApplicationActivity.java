package com.example.ntbd.auth;

import com.example.ntbd.domain.Timestamps;
import com.example.ntbd.persistence.ApplicationRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;


/**
 * Keeps an application's "last edited" (when, by whom) current for changes to anything in it: a
 * request that may change an application says so ({@link #changing}, from WorkspaceAccess), and once
 * it has succeeded the application is stamped with the time and the signed-in user.
 */
@RequiredArgsConstructor
@Component
public class ApplicationActivity {

    private static final String CHANGED_APPLICATION = ApplicationActivity.class.getName() + ".application";

    private final ApplicationRepository applicationRepository;
    private final CurrentUser currentUser;

    /** The current request changes this application (recorded only if it succeeds). */
    public void changing(Long applicationId) {
        RequestAttributes request = RequestContextHolder.getRequestAttributes();
        if (request != null && applicationId != null) {
            request.setAttribute(CHANGED_APPLICATION, applicationId, RequestAttributes.SCOPE_REQUEST);
        }
    }

    /** After every API request (WebConfig): stamps the application the request changed, if it succeeded. */
    public void requestCompleted(HttpServletRequest request, HttpServletResponse response, Exception ex) {
        if (!(request.getAttribute(CHANGED_APPLICATION) instanceof Long applicationId)) return;
        if (ex != null || response.getStatus() >= 400) return;
        currentUser.id().ifPresent(userId ->
                applicationRepository.touch(applicationId, userId.id(), Timestamps.nowUtc()));
    }
}
