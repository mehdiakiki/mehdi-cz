# Launch TODO

## Analytics
- [ ] Set up Umami (self-hosted or Umami Cloud)
- [ ] Add `NEXT_UMAMI_ID` to `.env` and rebuild Docker image
- [ ] Verify tracking is working on production

## Cloudflare
- [ ] Add domain `mehdi.cz` to Cloudflare
- [ ] Update nameservers at registrar to point to Cloudflare
- [ ] Set up DNS A/AAAA records pointing to server IP
- [ ] Enable SSL/TLS (Full Strict mode)
- [ ] Enable "Always Use HTTPS" redirect
- [ ] Set up caching rules (cache static assets, bypass for API routes)
- [ ] Optional: enable Cloudflare WAF / bot protection

## Email (hello@mehdi.cz)
- [ ] Set up email forwarding (Cloudflare Email Routing is free) or a provider (Zoho free tier, Fastmail, etc.)
- [ ] Add SPF, DKIM, and DMARC DNS records so outbound mail doesn't land in spam
- [ ] Test sending/receiving

## Giscus Comments
- [ ] Create a public GitHub Discussions-enabled repo (or enable on mehdi-cz)
- [ ] Go to https://giscus.app and generate config values
- [ ] Add `NEXT_PUBLIC_GISCUS_*` values to `.env` and rebuild Docker image

## Newsletter (Buttondown)
- [ ] Verify `BUTTONDOWN_API_KEY` is set and working in production
- [ ] Test subscribe flow end-to-end on the live site

## Final Checks
- [ ] Test contact form on production (Formspree)
- [ ] Check Open Graph / Twitter Card previews (use https://opengraph.xyz)
- [ ] Submit sitemap to Google Search Console (https://www.mehdi.cz/sitemap.xml)
- [ ] Check Lighthouse score and fix any issues
- [ ] Verify all project links on /work page are correct
- [ ] Test dark mode across all pages
