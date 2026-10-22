# Moistello Frontend — Agentic Development Guidelines

<!-- Wave: keep assigned moistello frontend checks grouped for CodeOtsutsuki007. -->

## Styling Rule

**NO page should look like another.** Every page MUST have unique styling elements beyond the shared theme tokens.

### Allowed (shared theme)

- Color tokens: `text-foreground`, `text-muted-foreground`, `text-aurora-violet`, `text-emerald-400`, `text-amber-400`, `text-red-400`
- Background tokens: `bg-background`, `bg-card`, `gradient-bg`, `gradient-bg-extended`, `gradient-text`, `gradient-text-extended`, `holo-text`
- Font families: `font-heading`, `font-mono`, `font-body`
- Utility tokens: `container-premium`
- Glow/effect: `holo-glow`, `holo-border`, `tilt-hover`, `animate-pulse-glow`, `depth-4`

### Forbidden

- `glass`, `glass-premium`, `glass-strong`, `glass-whisper`, `glass-flagship`, `rounded-2xl` — these are card defaults and make every page look identical

### Required (every page must pick different combinations)

Use 3+ of these per page. NO TWO PAGES should use the same set:

- **Border accents**: `border-l-4 border-l-aurora-violet` / directional borders on content blocks
- **Full-bleed sections**: Sections that span edge-to-edge with gradient backgrounds
- **Decorative pseudo-elements**: Gradient bars, accent lines, corner decorations via empty divs
- **Large typography**: Giant numbers, oversized headings as visual anchors
- **SVG/pattern backgrounds**: Inline SVG shapes, grid patterns, dot patterns
- **Pill/tag layouts**: Inline pill-shaped labels instead of card-contained lists
- **Underline/tab navigation**: Active indicator bars, animated underline accents
- **Floating elements**: Absolute-positioned decorative circles, blobs, or glyphs
- **Divider creativity**: Gradient dividers, angled separators, dotted lines instead of cards
- **Z-pattern layouts**: Alternating left/right content arrangement
- **Masonry/staggered grids**: Non-uniform grid layouts
- **Full-width callout strips**: Colored banner strips that cut across the layout
- **Avatar/initial clusters**: Grouped avatar circles as visual elements
- **Timeline layouts**: Vertical timeline with connecting lines and dots
- **Step indicators**: Numbered or icon-based step progress outside of cards
- **Toggle/switch arrays**: Rows of toggle switches without card wrapping

### Audit

Before building ANY new page, scan the existing pages for their styling fingerprint. If your page uses the same 3 elements as any existing page, change your approach.

## Component Decomposition Convention

### Page File Size Limit

**Rule**: No Next.js page file should exceed **300 lines** (excluding imports and types).

### When to Decompose

Decompose when a page file:

- Exceeds 300 lines
- Contains 3+ distinct UI sections
- Mixes data fetching, business logic, and presentation
- Has complex state management scattered across the component

### Decomposition Pattern

#### Before (Anti-pattern)

```tsx
// app/dashboard/page.tsx - 450 lines
export default function DashboardPage() {
  // 50 lines of state and hooks
  // 100 lines of data fetching logic
  // 300 lines of JSX with nested components
}
```

#### After (Correct pattern)

```
app/dashboard/
├── page.tsx                    # 80 lines - layout + orchestration
├── components/
│   ├── DashboardHeader.tsx     # 40 lines
│   ├── StatsGrid.tsx           # 60 lines
│   ├── ActivityFeed.tsx        # 80 lines
│   └── QuickActions.tsx        # 50 lines
├── hooks/
│   └── useDashboardData.ts     # 70 lines - data fetching
└── utils/
    └── dashboard-helpers.ts    # 40 lines - business logic
```

### Directory Structure Rules

1. **Page file** (`page.tsx`): Layout shell + composition only
   - Server component by default
   - Data fetching (if server component)
   - Pass props to client components
   - No complex JSX nesting (max 2-3 levels)

2. **`components/` subdirectory**: UI presentation components
   - One component per file
   - Named exports preferred for tree-shaking
   - Client components marked with `"use client"`
   - Keep under 150 lines each

3. **`hooks/` subdirectory**: Custom React hooks
   - Data fetching hooks (e.g., `useDashboard`, `useProfile`)
   - Form state hooks
   - Real-time subscription hooks
   - Keep under 100 lines each

4. **`utils/` subdirectory**: Pure functions
   - Calculations, formatters, validators
   - No React dependencies
   - Fully testable without DOM
   - Keep under 80 lines each

### Example: Profile Page Decomposition

```tsx
// app/profile/page.tsx (70 lines)
import { ProfileHeader } from "./components/ProfileHeader";
import { WalletSection } from "./components/WalletSection";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { getProfileData } from "./utils/profile-loader";

export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getProfileData(params.id);

  return (
    <div className="container-premium">
      <ProfileHeader user={profile.user} stats={profile.stats} />
      <WalletSection wallets={profile.wallets} />
      <ActivityTimeline activities={profile.activities} />
    </div>
  );
}
```

```tsx
// app/profile/components/ProfileHeader.tsx (60 lines)
"use client";

import { User, UserStats } from "@/types";
import { AvatarCluster } from "@/components/ui/avatar";
import { useProfileActions } from "../hooks/useProfileActions";

interface ProfileHeaderProps {
  user: User;
  stats: UserStats;
}

export function ProfileHeader({ user, stats }: ProfileHeaderProps) {
  const { handleFollow, handleMessage } = useProfileActions(user.id);

  return (
    <header className="border-l-4 border-l-aurora-violet pl-6">
      <div className="flex items-start gap-6">
        <AvatarCluster user={user} size="xl" />
        <div className="flex-1">
          <h1 className="text-4xl font-heading gradient-text">
            {user.displayName}
          </h1>
          <p className="text-muted-foreground">{user.bio}</p>
          <div className="mt-4 flex gap-4">
            <StatPill label="Followers" value={stats.followers} />
            <StatPill label="Following" value={stats.following} />
            <StatPill label="Posts" value={stats.posts} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleFollow} className="btn-primary">
            Follow
          </button>
          <button onClick={handleMessage} className="btn-secondary">
            Message
          </button>
        </div>
      </div>
    </header>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="pill">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-2xl font-mono font-bold">{value}</span>
    </div>
  );
}
```

```tsx
// app/profile/hooks/useProfileActions.ts (40 lines)
"use client";

import { useState } from "react";
import { post } from "@/lib/api-client";
import { recordMetric } from "@/lib/monitoring";

export function useProfileActions(userId: string) {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = async () => {
    try {
      await post("/api/follow", { userId });
      setIsFollowing(true);
      recordMetric("profile.follow", 1, { userId });
    } catch (error) {
      console.error("Failed to follow:", error);
    }
  };

  const handleMessage = () => {
    // Navigate to message compose
    window.location.href = `/messages/compose?to=${userId}`;
  };

  return { handleFollow, handleMessage, isFollowing };
}
```

### Refactoring Checklist

When decomposing an oversized page:

- [ ] Identify distinct UI sections (header, sidebar, main content, footer)
- [ ] Extract each section into its own component file
- [ ] Move data fetching logic into server actions or custom hooks
- [ ] Move utility functions into `utils/` subdirectory
- [ ] Ensure page.tsx is under 300 lines
- [ ] Verify all components are under 150 lines
- [ ] Add tests for extracted components
- [ ] Check bundle size impact (should be neutral or improved)

### CI Enforcement

A pre-commit hook checks page file sizes:

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check page file sizes
find src/app -name "page.tsx" -o -name "page.ts" | while read file; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt 300 ]; then
    echo "ERROR: $file exceeds 300 lines ($lines lines)"
    echo "Please decompose this page following docs/component-decomposition.md"
    exit 1
  fi
done
```

### Example Pages Following This Convention

Reference these pages as exemplars:

1. **`app/marketplace/page.tsx`** (180 lines)
   - Clean separation: filters, grid, pagination
   - Uses `useMarketplaceFilters` hook
   - Components: `MarketplaceFilters`, `ItemGrid`, `Pagination`

2. **`app/wallet/page.tsx`** (120 lines)
   - Server component with async data fetch
   - Passes data to client components
   - Components: `WalletHeader`, `TokenList`, `TransactionHistory`

3. **`app/create/page.tsx`** (200 lines)
   - Multi-step form decomposition
   - Uses `useCreateForm` hook for state
   - Components: `StepIndicator`, `MetadataForm`, `PreviewCard`

### Anti-Patterns to Avoid

❌ **Monolithic page with inline components**

```tsx
// app/dashboard/page.tsx - 600 lines
export default function Dashboard() {
  function Header() {
    /* 80 lines */
  }
  function Sidebar() {
    /* 120 lines */
  }
  function MainContent() {
    /* 400 lines */
  }
  // ...
}
```

❌ **Premature decomposition**

```tsx
// Overkill for a 50-line page
app/simple/
├── page.tsx (10 lines)
├── components/
│   ├── Title.tsx (5 lines)
│   ├── Body.tsx (15 lines)
│   └── Footer.tsx (8 lines)
```

✅ **Right-sized decomposition**

```tsx
// 250-line page: decompose into 3-4 components
app/dashboard/
├── page.tsx (80 lines)
└── components/
    ├── Header.tsx (60 lines)
    ├── Stats.tsx (70 lines)
    └── Actions.tsx (40 lines)
```

### Additional Resources

- [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Separation of Concerns](https://en.wikipedia.org/wiki/Separation_of_concerns)
- [Component Composition Patterns](https://www.patterns.dev/posts/compound-pattern)
