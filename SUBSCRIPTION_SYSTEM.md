# Subscription System Documentation

## Overview

This document describes the subscription system implementation for the TailorCraft tailor management app. The system introduces two subscription plans (FREE and PRO) with enforced limits on clients and orders.

## Architecture

### Backend

#### 1. Database Schema (`backend/prisma/schema.prisma`)
- Added `subscriptionPlan` enum with values `FREE` and `PRO`
- Added `subscriptionPlan` field to `User` model (defaults to `FREE`)
- Migration file created at `backend/prisma/migrations/migration_add_subscription_plan/migration.sql`

#### 2. Subscription Utility (`backend/src/lib/subscription.ts`)
Centralized subscription logic with:
- `PLAN_LIMITS` - Configuration object defining limits for each plan
  - FREE: 5 clients, 5 orders
  - PRO: Unlimited clients, unlimited orders
- `getUserSubscriptionStatus()` - Returns user's plan, limits, and current usage
- `checkCanCreateClient()` - Validates if user can create a new client
- `checkCanCreateOrder()` - Validates if user can create a new order
- `upgradeUserToPro()` - Upgrades user to PRO plan (mock payment)

#### 3. API Endpoints

**Customer Creation** (`backend/src/app/api/customers/route.ts`)
- Modified POST endpoint to check subscription limits before creating
- Returns 403 with `SUBSCRIPTION_LIMIT_REACHED` code if limit reached

**Order Creation** (`backend/src/app/api/orders/route.ts`)
- Modified POST endpoint to check subscription limits before creating
- Returns 403 with `SUBSCRIPTION_LIMIT_REACHED` code if limit reached

**Subscription Status** (`backend/src/app/api/subscription/status/route.ts`)
- GET endpoint returns user's subscription status
- Response includes: plan, limits, usage, canCreateClient, canCreateOrder

**Subscription Upgrade** (`backend/src/app/api/subscription/upgrade/route.ts`)
- POST endpoint upgrades user to PRO plan
- Currently implements mock payment logic
- Returns updated subscription status

### Frontend

#### 1. Subscription Context (`contexts/SubscriptionContext.tsx`)
Global state management for subscription:
- Automatically loads subscription status when user logs in
- Provides methods:
  - `refreshSubscription()` - Reloads subscription data
  - `upgradeToPro()` - Upgrades user to PRO
  - `checkCanCreateClient()` - Returns boolean
  - `checkCanCreateOrder()` - Returns boolean
- State includes: subscription status, loading state, error state

#### 2. Paywall Modal (`components/PaywallModal.tsx`)
Beautiful, non-aggressive modal that:
- Displays when FREE plan limits are reached
- Shows comparison between FREE and PRO plans
- Provides "Upgrade to Pro" button
- Uses modern design with gradients and icons
- Fully typed with TypeScript

#### 3. Integration Points

**App Layout** (`app/_layout.tsx`)
- Wraps app with `SubscriptionProvider`
- Loads subscription status on app start

**Client Creation** (`app/new-order/client-data.tsx`)
- Catches subscription limit errors when creating new clients
- Opens paywall modal on limit reached
- Allows retry after upgrade

**Order Creation** (`app/new-order/summary.tsx`)
- Catches subscription limit errors when creating new orders
- Opens paywall modal on limit reached
- Allows retry after upgrade

## How It Works

### User Flow - FREE Plan Limit

1. User tries to create 6th client or order
2. Backend checks subscription status
3. Backend returns 403 error with `SUBSCRIPTION_LIMIT_REACHED` code
4. Frontend catches error and opens paywall modal
5. User sees comparison: FREE (5 clients, 5 orders) vs PRO (unlimited)
6. User taps "Upgrade to Pro"
7. Mock payment is processed
8. User subscription is upgraded to PRO
9. Subscription state refreshes
10. Modal closes
11. User can now create unlimited clients/orders

### Server-Side Enforcement

All limits are enforced on the backend:
- No magic numbers in UI code
- All limits defined in `PLAN_LIMITS` constant
- Backend validates on every create operation
- Client cannot bypass limits

### UX Copy (Romanian)

- **Paywall Title**: "Limită Atinsă"
- **Subtitle**: "Ai atins limita planului gratuit"
- **Message**: "Fă upgrade la Pro pentru a gestiona clienți și comenzi nelimitate."
- **Upgrade Button**: "Upgrade la Pro"
- **Cancel Button**: "Nu acum"
- **Success Message**: "Cont upgradeat la Pro! Acum puteți crea [clienți/comenzi] nelimitate."

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
npx prisma migrate deploy  # Production
# OR
npx prisma migrate dev     # Development
```

### 2. Regenerate Prisma Client

```bash
cd backend
npx prisma generate
```

### 3. Install Frontend Dependencies

All required dependencies (lucide-react-native, react-native-reanimated, expo-blur) are already in package.json.

### 4. Test the System

**Test FREE Plan Limits:**
1. Create a new user account (defaults to FREE plan)
2. Create 5 clients
3. Try to create 6th client - paywall should appear
4. Try to create 6th order - paywall should appear

**Test PRO Upgrade:**
1. Tap "Upgrade to Pro" in paywall modal
2. User is upgraded (mock payment)
3. Create unlimited clients and orders

## Future Enhancements

### Payment Integration
Replace mock payment in `backend/src/app/api/subscription/upgrade/route.ts` with real payment provider:

```typescript
// Example with Stripe
const body = await req.json();
const { paymentMethodId } = body;

// Verify payment
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2999, // $29.99
  currency: 'usd',
  payment_method: paymentMethodId,
  confirm: true,
});

if (paymentIntent.status !== 'succeeded') {
  throw new Error('Payment failed');
}

// Then upgrade subscription
const updatedStatus = await upgradeUserToPro(req.user.userId);
```

### Multi-Tenancy Support
Current implementation counts all customers/orders. For true multi-tenancy:

1. Add `userId` field to `Customer` and `Order` models:
```prisma
model Customer {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
  // ... other fields
}
```

2. Update queries in `subscription.ts`:
```typescript
const [currentClients, currentOrders] = await Promise.all([
  prisma.customer.count({ where: { userId } }),
  prisma.order.count({ where: { userId } }),
]);
```

### Additional Plan Features
Extend `PLAN_LIMITS` with more features:
```typescript
export const PLAN_LIMITS = {
  FREE: {
    maxClients: 5,
    maxOrders: 5,
    maxPhotosPerOrder: 3,
    pdfCustomization: false,
    prioritySupport: false,
  },
  PRO: {
    maxClients: Infinity,
    maxOrders: Infinity,
    maxPhotosPerOrder: Infinity,
    pdfCustomization: true,
    prioritySupport: true,
  },
};
```

### Trial Periods
Add trial logic to User model:
```prisma
model User {
  subscriptionPlan      SubscriptionPlan @default(FREE)
  trialEndsAt          DateTime?
  subscriptionStartedAt DateTime?
}
```

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] New users default to FREE plan
- [ ] FREE users can create up to 5 clients
- [ ] FREE users can create up to 5 orders
- [ ] Paywall modal appears on 6th client creation attempt
- [ ] Paywall modal appears on 6th order creation attempt
- [ ] Upgrade button upgrades user to PRO
- [ ] PRO users can create unlimited clients
- [ ] PRO users can create unlimited orders
- [ ] Subscription status loads on app start
- [ ] Subscription status refreshes after upgrade
- [ ] Error messages are user-friendly (Romanian)

## Notes

- All subscription logic is centralized in `backend/src/lib/subscription.ts`
- No magic numbers in UI - all limits come from backend
- Fully typed with TypeScript throughout
- Follows existing architecture patterns (middleware, services, contexts)
- Mobile-friendly paywall modal with haptic feedback
- Non-aggressive UX - user can dismiss modal and continue
- Subscription state persists across app sessions

## Support

For questions or issues with the subscription system:
1. Check `SUBSCRIPTION_SYSTEM.md` (this file)
2. Review code comments in subscription-related files
3. Test with included checklist above
