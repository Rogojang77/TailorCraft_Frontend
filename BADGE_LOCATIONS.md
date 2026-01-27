# Pro Badge Locations

## Visual Guide

### 1. Profile Screen
```
┌─────────────────────────────────────┐
│  Profil Firmă [PRO]    [Edit]      │  ← Badge next to title
├─────────────────────────────────────┤
│                                     │
│  [Company Logo Section]             │
│                                     │
│  Company Information...             │
│                                     │
│  Subscription Section:              │
│  ┌────────────────────┐            │
│  │  [Crown] Plan Pro  │            │  ← Existing subscription display
│  └────────────────────┘            │
│                                     │
└─────────────────────────────────────┘
```

### 2. Home/Dashboard Screen
```
┌─────────────────────────────────────┐
│  Bună ziua! [PRO]          [+]      │  ← Badge next to greeting
│  Bine ați venit în TailorCraft     │
├─────────────────────────────────────┤
│                                     │
│  Clienți Recenți                   │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Client│ │Client│ │Client│       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│  Comenzi Recente                   │
│  ┌─────────────────────────┐      │
│  │ Order 1                 │      │
│  └─────────────────────────┘      │
└─────────────────────────────────────┘
```

### 3. Statistics Screen
```
┌─────────────────────────────────────┐
│  [←]    Statistici       [PRO]      │  ← Badge in top-right
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ Clienți  │  │ Comenzi  │       │
│  │ Total: 8 │  │ Active:4 │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │  Venit   │  │Finalizate│       │
│  │ 2500 RON │  │    12    │       │
│  └──────────┘  └──────────┘       │
│                                     │
└─────────────────────────────────────┘
```

## Badge Appearance

```
Small size (sm):
┌──────────┐
│ [♔] PRO  │  8px padding, 10px text
└──────────┘

Medium size (md):
┌────────────┐
│  [♔] PRO   │  10px padding, 12px text
└────────────┘
```

## Color Scheme

- **Background:** `#FFFBEB` (Cream/Light Gold)
- **Border:** `#D4AF37` (Gold) - 1.5px solid
- **Text:** `#D4AF37` (Gold) - Bold, 700 weight
- **Icon:** Crown (`lucide-react-native`) in Gold

## Behavior

| User Plan | Badge Visibility | Notes |
|-----------|-----------------|--------|
| FREE | Hidden | No badge shown anywhere |
| PRO | Visible | Shows in all 3 locations |
| Loading | Hidden | No placeholder or flicker |

## Component API Quick Reference

```tsx
// Import
import { ProBadge } from '@/components/ProBadge';

// Usage Examples
<ProBadge />                           // Medium, auto-check
<ProBadge size="sm" />                 // Small size
<ProBadge style={{ marginLeft: 8 }} /> // With custom spacing
<ProBadge label="ENTERPRISE" />        // Custom plan label
<ProBadge showIfFree={true} />         // Debug mode
```

## Files Modified

1. ✅ `components/ProBadge.tsx` - New component (108 lines)
2. ✅ `app/(tabs)/profile.tsx` - Added badge to header
3. ✅ `app/(tabs)/index.tsx` - Added badge to greeting
4. ✅ `app/stats.tsx` - Added badge to header + fixed color bugs

## Zero Breaking Changes

- No existing functionality modified
- No existing UI disturbed
- Purely additive implementation
- Backward compatible
