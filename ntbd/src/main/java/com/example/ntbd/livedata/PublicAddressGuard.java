package com.example.ntbd.livedata;

import com.example.ntbd.Exception.ConnectorException;
import org.springframework.stereotype.Component;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

/**
 * Keeps connections from reaching this server's own network: a host (database, API) must resolve to public
 * addresses only, never private, loopback, link-local (cloud metadata), CGNAT or multicast ones. The same
 * rules as the flow sidecar's HTTP requests (flow-engine/server/public-fetch.ts).
 * {@code app.data.allow-private-hosts} lifts it for local development and tests.
 */
@Component
public class PublicAddressGuard {

    private final boolean allowPrivate;

    public PublicAddressGuard(LiveDataProperties properties) {
        this.allowPrivate = properties.allowPrivateHosts();
    }

    /** Throws unless every address the host resolves to is public. */
    public void requirePublicHost(String host) {
        if (host == null || host.isBlank()) throw new IllegalArgumentException("A host is required");
        if (allowPrivate) return;
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException e) {
            throw new ConnectorException("The host " + host + " can't be found");
        }
        for (InetAddress address : addresses) {
            if (!isPublic(address)) {
                throw new ConnectorException("The host " + host + " is on a private network; connections must use public addresses");
            }
        }
    }

    /** Throws unless the URL is http(s) to a public host. */
    public void requirePublicUrl(String url) {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Not a valid URL: " + url);
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        if (!scheme.equals("https") && !(scheme.equals("http") && allowPrivate)) {
            throw new IllegalArgumentException("URLs must start with https://");
        }
        requirePublicHost(uri.getHost());
    }

    static boolean isPublic(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) {
            return false;
        }
        byte[] b = address.getAddress();
        if (address instanceof Inet4Address) {
            int first = b[0] & 0xff, second = b[1] & 0xff;
            // 0/8, CGNAT 100.64/10, benchmarking 198.18/15, reserved 240/4
            return first != 0 && !(first == 100 && second >= 64 && second < 128)
                    && !(first == 198 && (second == 18 || second == 19)) && first < 240;
        }
        if (address instanceof Inet6Address) {
            // Unique local fc00::/7
            return (b[0] & 0xfe) != 0xfc;
        }
        return true;
    }
}
