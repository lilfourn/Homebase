# Clerk JWT Template Setup for Convex

To fix the "No JWT template exists with name: convex" error, follow these steps:

## 1. Go to Clerk Dashboard
Navigate to https://dashboard.clerk.com

## 2. Select Your Application

## 3. Create JWT Template
1. Go to "JWT Templates" in the left sidebar
2. Click "New template"
3. Name it exactly: `convex`
4. Use this template:

```json
{
  "aud": "{{convexUrl}}",
  "sub": "{{user.id}}"
}
```

## 4. Save the Template

## 5. Update Environment Variables
Make sure your `.env.local` has:
```
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
CONVEX_DEPLOYMENT=<your-convex-deployment-name>
```

This template is required for Clerk to authenticate with Convex.