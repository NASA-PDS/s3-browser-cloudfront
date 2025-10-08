try {
    const referrer = document.referrer;
    if (referrer) {
        const referrerUrl = new URL(referrer);
        const currentOrigin = globalThis.location.origin;
        // Only allow same-origin referrers and only those with http/https
        if ((referrerUrl.protocol === 'http:' || referrerUrl.protocol === 'https:')
            && referrerUrl.origin === currentOrigin) {
            $(".card a.btn").attr("href", referrer);
        } else {
            $(".card a.btn").attr("href", '/');
        }
    } else {
        $(".card a.btn").attr("href", '/');
    }
} catch {
    // Invalid URL: use safe fallback of /
    $(".card a.btn").attr("href", '/');
}
