# Distribution Software ERP — Deployment Checklist

## Overview
This checklist ensures all deployment steps are completed correctly.

## Pre-Deployment
- [ ] Verify all tests pass: `npm test`
- [ ] Verify TypeScript compiles: `npx tsc --noEmit`
- [ ] Verify production build: `npm run build`
- [ ] Verify local server starts with DATABASE_URL set

## Render Backend Deployment
1. **Create Render Account**
   - [ ] Sign up at https://render.com
   - [ ] Connect GitHub repository

2. **Create Web Service**
   - [ ] Use Blueprint from `render.yaml`
   - [ ] Service name: `distribution-erp`
   - [ ] Runtime: Node
   - [ ] Plan: Starter ($7/month minimum)

3. **Set Environment Variables**
   - [ ] `NODE_ENV=production`
   - [ ] `PORT=10000`
   - [ ] `DATABASE_URL=postgresql://postgres:password@db.rbmlcpcqvylzmqwqxlsw.supabase.co:5432/postgres`
   - [ ] `SESSION_SECRET=<generate-64-char-hex-string>`
   - [ ] `SESSION_MAX_AGE_MS=1800000`
   - [ ] `SESSION_COOKIE_NAME=erp_session`
   - [ ] `ALLOWED_ORIGINS=https://global-distributions-software-mauve.vercel.app`

4. **Deploy**
   - [ ] Trigger first deployment
   - [ ] Verify build succeeds
   - [ ] Verify health check passes: `GET /api/health`

## Vercel Frontend Deployment
1. **Set Environment Variables**
   - [ ] `VITE_API_URL=https://distribution-erp.onrender.com/api`
   - [ ] `VITE_DEMO_MODE=false`

2. **Redeploy**
   - [ ] Trigger new deployment
   - [ ] Verify build succeeds

## Post-Deployment Verification
1. **Backend Health**
   - [ ] `curl https://distribution-erp.onrender.com/api/health`
   - [ ] Response: `{"status":"ok","mode":"production"}`

2. **Frontend Brand Loading**
   - [ ] Open https://global-distributions-software-mauve.vercel.app
   - [ ] Brand selection page loads
   - [ ] Brands appear from database

3. **Authentication**
   - [ ] Login with admin credentials
   - [ ] Session cookie set (HTTP-only)
   - [ ] Logout works

4. **CORS**
   - [ ] No CORS errors in browser console
   - [ ] Cross-origin requests succeed

## Rollback Plan
- If backend fails: Set `VITE_API_URL=` in Vercel to empty (reverts to demo mode)
- If frontend fails: Revert to previous Vercel deployment

## Troubleshooting
- **Brand loading fails**: Check backend logs in Render dashboard
- **CORS errors**: Verify `ALLOWED_ORIGINS` matches frontend URL
- **Session issues**: Check `SESSION_SECRET` is set and secure
- **Database connection**: Verify `DATABASE_URL` is correct
