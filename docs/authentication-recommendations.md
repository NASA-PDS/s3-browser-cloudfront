# AWS Deployment & Cognito Authentication Recommendations

## Overview

This document describes recommended approaches for adding authentication to the PDS S3 Web Browser. Recommendations are organized by **which surface you need to protect**, since they have different trade-offs, effort levels, and UX implications.

### The Two Security Surfaces

The deployment has two distinct layers that can be protected independently or together:

| Surface | What It Is | Default State |
|---|---|---|
| **Interface** | The SPA (HTML/JS/CSS) served via the app CloudFront distribution | Public |
| **S3 Objects (Data)** | The actual PDS files served via data CloudFront distribution(s) | Public |

The app makes **direct browser requests** to data CloudFront URLs (defined in `src/js/missions.js`). This means:
- Protecting only the interface still leaves data URLs reachable if someone discovers them
- Protecting only the data means the directory browser is public but file downloads require auth — which requires careful UX handling (see Scenario 2 below)

Choose your scenario based on your access control requirements:

- **[Scenario 1](#scenario-1-interface-access-control-only)** — Gate access to the browsing interface; data remains public
- **[Scenario 2](#scenario-2-s3-object-data-access-control-only)** — Directory browsing is public; actual file downloads require auth
- **[Scenario 3](#scenario-3-full-stack-protection-interface--data)** — Both the interface and the data require authentication

---

## Comparison Summary

| Option | Scenario | Effort | Protects Interface | Protects Data | SSO-Swappable | App Code Changes |
|---|---|---|---|---|---|---|
| A: Client-side Cognito (Amplify) | 1 | Low | Yes (UI only) | No | Via Cognito federation | Yes |
| B: Lambda@Edge on app distribution | 1 | Low–Medium | Yes (CDN layer) | No | Via Cognito federation | No |
| C: Pre-signed URL signing service | 2 | Medium | No | Yes (S3 level) | Via Cognito federation | Yes |
| D: CloudFront Signed Cookies on data distributions | 2 | Medium | No | Yes (CDN layer) | Via Cognito federation | No |
| E: Lambda@Edge on all distributions | 3 | Medium | Yes | Yes | Via Cognito federation | No |
| F: OIDC + Signed Cookies (full stack) | 3 | High | Yes | Yes | Fully decoupled | No |

---

## Scenario 1: Interface Access Control Only

**Goal:** Require users to authenticate before they can use the directory browser. The PDS data itself is considered public or accessible by direct URL — you are controlling access to the browsing experience.

**Suitable when:** Data is open/public but you want to track or limit who can browse using this tool, or you need a lightweight access gate before broader rollout.

---

### Option A: Client-Side Cognito via AWS Amplify (Near-Term, Easiest)

#### How It Works

Add the AWS Amplify Auth library to the SPA. Before rendering the app, check for a valid Cognito session. If absent, redirect to the Cognito Hosted UI. On return, the SPA renders normally.

```
Browser → CloudFront (app) → S3 (app code)
             ↓
          SPA loads, checks Cognito session in localStorage/cookie
             ↓ unauthenticated
          Redirect → Cognito Hosted UI → user logs in → redirect back
             ↓ authenticated
          SPA renders; makes direct public requests to data CloudFront
```

#### Implementation Steps

1. Create a Cognito User Pool + App Client (SPA type, no client secret)
2. Configure Hosted UI with callback URLs matching your deployment domains
3. Add the Amplify Auth package:
   ```bash
   npm install @aws-amplify/auth
   ```
4. In `src/js/main.js`, add an auth check before `$("main").show()` — redirect to Cognito if no active session
5. Rebuild and redeploy to S3

#### Effort
1–2 days

#### Pros
- Fastest to implement; minimal AWS infrastructure
- Cognito User Pool can federate with JPL/NASA SSO later (SAML or OIDC) — no rebuild needed when SSO changes

#### Cons
- Requires modifying app source code (`main.js`)
- Only protects the UI — data CloudFront URLs remain accessible without authentication
- JWT stored in browser; XSS risk if not using `httpOnly` cookies

---

### Option B: Lambda@Edge on App Distribution Only (Near-Term, No Code Changes)

#### How It Works

A Lambda@Edge `viewer-request` function sits in front of the app CloudFront distribution and validates a Cognito JWT cookie. Unauthenticated requests are redirected to Cognito Hosted UI. The data CloudFront distributions are not touched.

```
Browser → CloudFront (app)
             ↓
          Lambda@Edge: viewer-request
          JWT cookie valid? → Yes: serve app → No: redirect to Cognito
             ↓
          Cognito Hosted UI → login → redirect back with auth code
             ↓
          Lambda@Edge sets JWT cookie, serves app
             ↓
          SPA renders; makes direct public requests to data CloudFront
```

#### Implementation Steps

1. Create a Cognito User Pool + App Client (authorization code grant, PKCE)
2. Deploy a Lambda@Edge function to `us-east-1`:
   - Use [aws-samples/cognito-at-edge](https://github.com/aws-samples/cognito-at-edge) to handle the OAuth2 PKCE flow
3. Associate the function with the **app CloudFront distribution only** as a `viewer-request` trigger
4. Configure CloudFront to forward the auth cookie to Lambda@Edge
5. Set the Cognito callback URL to your app CloudFront domain

#### Effort
2–3 days

#### Pros
- No app code changes
- CDN-layer protection — the SPA files themselves are never served to unauthenticated users
- Easy path to Scenario 3 later: just attach the same function to data distributions
- Cognito federation ready for future SSO swap

#### Cons
- Lambda@Edge must be deployed in `us-east-1`
- Data CloudFront URLs are still publicly accessible
- Lambda@Edge adds ~5–50ms latency on first request (cold start)

#### Long-Term Extension (Scenario 1)

When you add a future SSO provider, simply add it to the Cognito User Pool as a federated identity provider (SAML or OIDC). Lambda@Edge code and CloudFront configuration do not change. No app code changes.

---

## Scenario 2: S3 Object (Data) Access Control Only

**Goal:** The directory browser interface is publicly accessible — anyone can see what data exists — but actually downloading or accessing file contents requires authentication.

**Suitable when:** PDS data is sensitive or access-controlled, but you want the catalog/directory to be openly discoverable. Also useful as a stepping stone before protecting the full stack.

**Important UX consideration:** Because the current app generates file download links as direct CloudFront URLs (`BUCKET_URL + '/' + item.Key` in `src/js/list.js`), a naive CloudFront-level auth gate on the data distribution would redirect the user's browser away from the app to the data CloudFront domain when they click a file — creating a broken UX. The two options below address this differently.

---

### Option C: Pre-Signed URL Signing Service (Near-Term, Cleanest UX)

#### How It Works

A small serverless signing service (API Gateway + Lambda) sits between the app and S3. Instead of generating direct CloudFront URLs for file downloads, the SPA calls the signing service, which validates the user's Cognito JWT and returns a time-limited pre-signed S3 URL. The user's browser downloads the file from that pre-signed URL — never hitting a generic CloudFront auth gate mid-session.

```
Browser → CloudFront (app) → SPA renders (public, no auth required)
             ↓ user clicks a file
          SPA → API Gateway → Lambda (signing service)
                                  ↓ validates Cognito JWT from request header
                                  ↓ authenticated: generate S3 pre-signed URL (15–60 min TTL)
                                  ↓ return URL to SPA
          SPA redirects browser to pre-signed URL → file downloads from S3
```

Directory listing still works publicly via the data CloudFront REST API (XML listing, no file content served). Only actual file downloads require auth.

#### Implementation Steps

1. Create a Cognito User Pool + App Client (authorization code grant, PKCE)
2. Add client-side Cognito auth to the SPA (similar to Option A, but minimal — just to get a JWT for the signing API calls)
3. Deploy a signing Lambda + API Gateway:
   - Validate the Cognito JWT from the `Authorization` header
   - Call `s3.getSignedUrl('getObject', { Bucket, Key, Expires })` and return the URL
4. Modify `src/js/list.js`: for file-type entries, replace `item.href = BUCKET_URL + '/' + item.Key` with a call to the signing endpoint
5. Keep S3 data buckets with OAC (no public direct S3 access); keep data CloudFront public for XML listing only

#### Effort
1–1.5 weeks (new backend service + app code changes)

#### Pros
- Clean UX — the directory browser stays public; only file download triggers auth
- S3 objects are never directly exposed; all file access is mediated by the signing service
- Pre-signed URLs expire automatically (no persistent access after link sharing)
- Signing Lambda can enforce fine-grained access policies (e.g., per-mission, per-prefix)

#### Cons
- Requires app source code changes in `list.js`
- Requires a new backend service (Lambda + API Gateway) — additional infrastructure to maintain
- Slightly more complex local development setup

---

### Option D: CloudFront Signed Cookies on Data Distributions (Near-Term, No App Code Changes)

#### How It Works

The data CloudFront distribution(s) are configured to require **CloudFront signed cookies** for all requests. A separate small auth endpoint (Lambda + API Gateway, or a simple redirect through the app distribution's Lambda@Edge) issues a signed cookie after Cognito authentication. Once the cookie is set in the browser, all subsequent requests to the data CloudFront proceed without re-authentication.

```
Browser → CloudFront (app) → serves SPA (public)
             ↓ SPA loads
          SPA checks for valid signed cookie on data domain
             ↓ no cookie: redirect to auth endpoint
          Auth endpoint → Cognito Hosted UI → user logs in
             ↓ authenticated
          Auth endpoint issues CloudFront signed cookie (scoped to data domain)
             ↓ cookie set in browser
          Browser → CloudFront (data) → signed cookie validates → file served
```

#### Implementation Steps

1. Create a Cognito User Pool + App Client
2. Generate a CloudFront key pair; create a key group; associate it with data distribution(s)
3. Deploy a small cookie-signing Lambda + API Gateway:
   - Validates Cognito JWT
   - Issues CloudFront signed cookies via the CloudFront key pair
   - Sets cookies with `Domain` scoped to the data CloudFront domain
4. In the SPA (minimal change), add a cookie-check on init: if cookie absent, redirect to signing endpoint

#### Effort
3–5 days

#### Pros
- No changes to `list.js` — file download links remain as direct CloudFront URLs
- CloudFront validates signed cookies natively (no Lambda invocation per file request after initial auth)
- Scales well across multiple data distributions sharing the same key group

#### Cons
- Cookie `Domain` scoping is tricky when the app and data distributions are on different domains (different CloudFront hostnames) — the app can't set a cookie for the data domain directly; the user must visit the data domain once to receive it
- Cross-domain cookie issues require `SameSite=None; Secure` and CORS configuration
- CloudFront key pair management (rotation) adds operational overhead

#### Long-Term Extension (Scenario 2)

Both Options C and D can be extended to full Scenario 3 by adding Lambda@Edge to the app distribution as well. The same Cognito User Pool handles both surfaces. Adding a future SSO provider (JPL SSO, NASA Agency SSO) requires only a new Cognito identity provider federation config — no code changes.

---

## Scenario 3: Full Stack Protection (Interface + Data)

**Goal:** Both the browsing interface and the underlying data files require authentication. This is the most comprehensive posture.

**Suitable when:** PDS data is restricted, access must be fully audited, or compliance requirements demand end-to-end access control.

---

### Option E: Lambda@Edge on All Distributions (Recommended Near-Term)

#### How It Works

Extends Option B to cover all CloudFront distributions. A Lambda@Edge `viewer-request` function is attached to both the app distribution and each data distribution. A single Cognito User Pool and JWT cookie covers all of them, since the cookie is set on the app domain and forwarded on requests to data distributions (provided they share the same parent domain, as they do on `*.mcp.nasa.gov`).

```
Browser → CloudFront (app or data)
             ↓
          Lambda@Edge: viewer-request
          JWT cookie valid?
          Yes → serve content (app files or data files)
          No  → 302 redirect to Cognito Hosted UI
             ↓
          Cognito → user logs in → redirect back with auth code
             ↓
          Lambda@Edge exchanges code for JWT, sets cookie
             ↓
          All subsequent requests to all distributions validated by the same cookie
```

#### Implementation Steps

1. Create a Cognito User Pool + App Client (authorization code grant, PKCE)
2. Deploy Lambda@Edge using [aws-samples/cognito-at-edge](https://github.com/aws-samples/cognito-at-edge) to `us-east-1`
3. Associate the function with:
   - The app CloudFront distribution (as `viewer-request`)
   - Each data CloudFront distribution (as `viewer-request`)
4. Configure each distribution to forward the auth cookie to Lambda@Edge
5. Set one Cognito callback URL per distribution (or use one app distribution URL and set cookie domain to the shared parent domain)

#### Effort
3–5 days

#### Pros
- Zero app code changes
- Single auth flow covers all surfaces
- Simple operational model — one Lambda function, one Cognito User Pool
- Straightforward migration path to Option F (just add signed cookie issuance)
- Cognito federation supports future SSO swap without code changes

#### Cons
- Lambda@Edge must be in `us-east-1`; logging is distributed across CloudWatch regions
- All distributions must share a parent domain for the cookie to work cross-distribution without additional redirects (works on `*.mcp.nasa.gov`; may need adjustment otherwise)
- Lambda invocation on every uncached request adds latency

---

### Option F: OIDC Federation + CloudFront Signed Cookies (Recommended Long-Term)

#### How It Works

Builds on Option E by replacing per-request JWT validation with CloudFront's native signed cookie verification. Cognito acts as a stable OIDC federation broker in front of any upstream IdP. After a single login, Lambda@Edge issues a signed cookie; CloudFront validates it natively on all subsequent requests with no Lambda invocation.

```
Browser → CloudFront (any distribution)
             ↓
          Lambda@Edge: check for valid signed cookie
             ↓ no valid cookie
          Redirect → Cognito Hosted UI
          Cognito federates to: JPL SSO | NASA Agency SSO | future IdP (SAML/OIDC)
             ↓ authenticated
          Lambda@Edge issues CloudFront signed cookie (via key pair)
          Cookie scoped to parent domain covers all distributions
             ↓ subsequent requests
          CloudFront validates signature natively — no Lambda invocation per request
```

#### Key Components

| Component | Purpose |
|---|---|
| Cognito User Pool | Stable OIDC interface; federates with any upstream IdP |
| Cognito Identity Provider config | Pluggable — add/remove IdPs without code changes |
| Lambda@Edge | OIDC auth flow + signed cookie issuance on login only |
| CloudFront key pair + key group | Native cookie validation across all distributions |
| Terraform (full IaC) | Reproducible dev/test/prod environments |

#### Swapping SSO Providers

When you need to move to JPL SSO or a future NASA Agency SSO:

1. In Cognito, configure a new Identity Provider:
   - **SAML**: upload IdP metadata XML (e.g., from `sso3.jpl.nasa.gov`)
   - **OIDC**: provide issuer URL, client ID, client secret
2. Add the IdP to `supported_identity_providers` in the Cognito App Client
3. **No Lambda@Edge changes**
4. **No CloudFront changes**
5. **No application code changes**

This is the key architectural benefit of using Cognito as a broker: it is the stable OIDC interface your infrastructure talks to; everything upstream of it is swappable.

#### Effort
1–2 weeks for full Terraform-managed implementation

#### Pros
- Fully interchangeable auth layer
- Native CloudFront cookie validation = lower latency and cost at scale
- One key group covers all distributions
- Full Terraform IaC across all environments (aligns with wiki PDF note to move S3/CloudFront config to Terraform in this repo)
- Works with JPL SAML SSO (`sso3.jpl.nasa.gov`) today

#### Cons
- Most complex to implement initially
- CloudFront key pair rotation requires an operational process
- Signed cookie expiry management needs tuning (TTL vs. re-auth frequency)

#### Terraform Structure

```
terraform/
├── modules/
│   ├── cognito/          # User Pool, App Client, identity provider federation
│   ├── lambda-auth/      # Lambda@Edge: auth flow + signed cookie issuance
│   └── cloudfront/       # Distributions, key groups, trusted signers
├── environments/
│   ├── dev/              # pds-sit.mcp.nasa.gov
│   ├── test/             # pds-uat.mcp.nasa.gov
│   └── prod/             # pds.mcp.nasa.gov
└── README.md
```

---

## Recommended Path Forward

### Decision Guide

| If your goal is... | Start with | Migrate to |
|---|---|---|
| Gate the interface only; data is public | Option B (Lambda@Edge, app only) | Option F (add data distributions + Terraform) |
| Public browsing; authenticated downloads | Option C (pre-signed URL service) | Option F (add interface protection + Terraform) |
| Full protection, fastest | Option E (Lambda@Edge, all distributions) | Option F (add signed cookies + Terraform) |

### Near-Term Recommendation (All Scenarios)

For all three scenarios, the near-term approach is to:

1. **Create one Cognito User Pool** — even if you start with only one surface protected, sizing and configuring it for federation from the start costs nothing extra and prevents a rebuild later
2. **Leave `supported_identity_providers` as `["COGNITO"]` initially** — add your future SSO (SAML/OIDC) as a federated identity provider when ready, no rebuild needed
3. **Use [aws-samples/cognito-at-edge](https://github.com/aws-samples/cognito-at-edge)** for any Lambda@Edge implementation — reduces implementation time significantly

**Cognito User Pool checklist (applies to all options):**
- [ ] Enable hosted UI
- [ ] App client: Authorization code grant, PKCE enabled
- [ ] Token validity: access=1h, refresh=30d (adjust per security policy)
- [ ] `allowed_oauth_scopes`: `openid email profile`
- [ ] Callback URL: `https://your-cloudfront-domain/callback`
- [ ] Sign-out URL: `https://your-cloudfront-domain/`

### Long-Term Recommendation (All Scenarios)

Migrate to **Option F** regardless of which near-term path you take, and formalize all infrastructure as Terraform per the note in the deployment wiki that S3/CloudFront configuration should move to Terraform in this repository.

---

## References

- [AWS: Lambda@Edge for authentication](https://aws.amazon.com/blogs/networking-and-content-delivery/authorizationedge-using-cookies-protect-your-amazon-cloudfront-content-from-being-downloaded-by-unauthenticated-users/)
- [aws-samples/cognito-at-edge](https://github.com/aws-samples/cognito-at-edge)
- [AWS: CloudFront signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html)
- [AWS: S3 pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [AWS: Cognito SAML identity providers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp.html)
- [AWS: Cognito OIDC identity providers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html)
