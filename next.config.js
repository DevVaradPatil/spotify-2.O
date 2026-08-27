/** @type {import('next').NextConfig} */

const supabaseHost = (() => {
    try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
    } catch {
        // Falls back to the historical hardcoded value so a missing env var
        // does not break local builds.
        return "cbtxuixvqgfsqnidxutk.supabase.co";
    }
})();

const securityHeaders = [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload"
    },
    // Report-only for now. A blocking CSP needs tuning against Supabase,
    // Stripe, the room WebSocket, and the inline styles framer-motion emits
    // — shipping one blind would break the app. Watch the browser console
    // for violations, tighten, then promote to Content-Security-Policy.
    {
        key: "Content-Security-Policy-Report-Only",
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "media-src 'self' blob: https:",
            `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.stripe.com ${process.env.NEXT_PUBLIC_WS_URL || ""}`.trim(),
            "frame-src https://js.stripe.com https://hooks.stripe.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join("; ")
    }
];

const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: "https", hostname: supabaseHost },
            { protocol: "https", hostname: "vitals.vercel-insights.com" },
            // OAuth avatars (Google / GitHub) are rendered via next/image.
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
            { protocol: "https", hostname: "avatars.githubusercontent.com" }
        ]
    },
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    }
}

module.exports = nextConfig
