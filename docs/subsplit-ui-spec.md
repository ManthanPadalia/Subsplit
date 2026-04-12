# SubSplit — UI Specification Document

**Version:** 1.0  
**Status:** Final — MVP  
**Framework:** React 18 + TypeScript + Vite  
**Styling:** Tailwind CSS v3 + shadcn/ui  
**Theming:** next-themes (light/dark)  
**Routing:** React Router v6  
**State:** TanStack Query + Zustand  
**Last Updated:** April 2026

---

## Table of Contents

1. [Global Rules](#1-global-rules)
2. [Layout Shell](#2-layout-shell)
3. [Page: Homepage](#3-page-homepage)
4. [Page: Browse Plans](#4-page-browse-plans)
5. [Page: Plan Detail + Checkout](#5-page-plan-detail--checkout)
6. [Page: Login](#6-page-login)
7. [Page: Signup](#7-page-signup)
8. [Page: User Dashboard](#8-page-user-dashboard)
9. [Page: Admin Dashboard](#9-page-admin-dashboard)
10. [Page: Admin Analytics](#10-page-admin-analytics)
11. [Page: Admin Plan Management](#11-page-admin-plan-management)
12. [Shared Components](#12-shared-components)
13. [State Patterns](#13-state-patterns)
14. [Routing and Protection](#14-routing-and-protection)
15. [API Integration Layer](#15-api-integration-layer)

---

## 1. Global Rules

### The single most important rule
**Never use hardcoded color classes.** Every Tailwind color class must use a CSS variable-based semantic token. This is what makes dark mode work automatically.

| WRONG — breaks dark mode | CORRECT — works in both modes |
|---|---|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-gray-50` | `bg-muted` |
| `text-gray-700` | `text-muted-foreground` |
| `text-black` | `text-foreground` |
| `border-gray-200` | `border-border` |
| `bg-violet-600` | `bg-primary` |
| `text-violet-600` | `text-primary` |
| `bg-green-50` | `bg-success/10` |
| `text-green-600` | `text-success` |

### Typography classes
Use these exact class combinations consistently:

```
Display:  text-4xl font-bold tracking-tight text-foreground
H1:       text-2xl font-semibold tracking-tight text-foreground
H2:       text-lg font-semibold text-foreground
H3:       text-base font-semibold text-foreground
Body:     text-sm text-muted-foreground leading-relaxed
Label:    text-xs font-medium uppercase tracking-wide text-muted-foreground
Price:    text-3xl font-bold tabular-nums text-foreground
```

### Spacing rhythm
- Page horizontal padding: `px-4 md:px-8 lg:px-12`
- Section vertical gap: `space-y-8` or `gap-8`
- Card internal padding: `p-4 md:p-6`
- Component gap: `gap-3` or `gap-4`

### Card anatomy
Every card follows this exact pattern:
```tsx
<div className="bg-card border border-border rounded-lg p-4 md:p-6">
  ...
</div>
```

### Elevation — border only, never shadow
- Default: `border border-border`
- Hover: `border border-border/80 ring-1 ring-border`
- Selected/featured: `border-2 border-primary`
- Never use `shadow-*` classes

### Animations
- Page entry: `animate-in fade-in-0 slide-in-from-bottom-4 duration-300`
- Skeleton pulse: shadcn `<Skeleton />` component
- Number changes: use `framer-motion` `<AnimatePresence>` + `<motion.span>`
- Hover transitions: `transition-colors duration-200`

### Brand accent bar
Plans and featured cards get a 3px top border in the primary color:
```tsx
<div className="relative ...">
  <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary rounded-t-lg" />
  ...
</div>
```

### Slot dots
The visual slot availability indicator uses this exact component:
```tsx
// SlotDot: filled = primary color, empty = muted border
<div
  className={cn(
    "w-2.5 h-2.5 rounded-sm",
    filled ? "bg-primary" : "bg-muted border border-border"
  )}
/>
```

### Status badges
Use these exact class combinations for slot/payment status:

```tsx
const statusStyles = {
  ACTIVE:       "bg-success/10 text-success border-success/20",
  GRACE:        "bg-warning/10 text-warning border-warning/20",
  REVOKED:      "bg-destructive/10 text-destructive border-destructive/20",
  AVAILABLE:    "bg-muted text-muted-foreground border-border",
  SUCCESS:      "bg-success/10 text-success border-success/20",
  FAILED:       "bg-destructive/10 text-destructive border-destructive/20",
  PENDING:      "bg-warning/10 text-warning border-warning/20",
  STREAMING:    "bg-primary/10 text-primary border-primary/20",
  EDUCATION:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
  GAMING:       "bg-purple-500/10 text-purple-600 border-purple-500/20",
  PRODUCTIVITY: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  MUSIC:        "bg-green-500/10 text-green-600 border-green-500/20",
}
```

All badges use: `text-xs font-medium px-2 py-0.5 rounded border inline-flex items-center`

---

## 2. Layout Shell

File: `src/components/layout/AppShell.tsx`

### Navbar

**Height:** 56px fixed  
**Background:** `bg-background/80 backdrop-blur-sm border-b border-border`  
**Z-index:** `z-50`

**Left side:**
- SubSplit wordmark: `Sub` in `text-foreground font-bold`, `Split` in `text-primary font-bold`, size `text-xl`
- Clicking the logo navigates to `/`

**Center (desktop only, hidden on mobile):**
- `Browse plans` → navigates to `/plans`
- `How it works` → scrolls to `#how-it-works` section on homepage
- Links: `text-sm text-muted-foreground hover:text-foreground transition-colors`

**Right side — unauthenticated:**
- Theme toggle button (Sun/Moon icon, `variant="ghost" size="icon"`)
- `Log in` button → `/login` (`variant="ghost"`)
- `Get started` button → `/signup` (`variant="default"` — fills with `bg-primary`)

**Right side — authenticated (USER role):**
- Theme toggle button
- User avatar circle: initials from `name`, `bg-primary/10 text-primary` 28px circle
- Clicking avatar opens a dropdown:
  - User name + email (non-clickable, display only)
  - Divider
  - `Dashboard` → `/dashboard`
  - `Account settings` → `/dashboard/settings`
  - Divider
  - `Log out` → clears Zustand auth store, redirects to `/`

**Right side — authenticated (ADMIN role):**
- Same as user but dropdown includes:
  - `Admin dashboard` → `/admin`
  - `Analytics` → `/admin/analytics`

**Mobile navbar:**
- Show only logo and hamburger icon
- Hamburger opens a slide-in sheet from the right with all nav links

---

### Footer

**Height:** auto  
**Background:** `bg-muted/50 border-t border-border`  
**Padding:** `py-8 px-4 md:px-8`

**Content:**
- Left: SubSplit wordmark + tagline "Pay only for the slot you use."
- Right: links — Privacy Policy, Terms, Contact (non-functional for MVP, just rendered)
- Bottom row: "© 2026 SubSplit. Not affiliated with any subscription service provider."

Footer appears on all public pages. Hidden on `/admin/*` pages.

---

### Page wrapper
All pages use this wrapper for consistent padding and max-width:
```tsx
<main className="min-h-screen bg-background">
  <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
    {/* page content */}
  </div>
</main>
```

Admin pages use a wider max-width: `max-w-7xl`

---

## 3. Page: Homepage

**File:** `src/pages/HomePage.tsx`  
**Route:** `/`  
**Auth:** None required  
**Layout:** Full-width with max-width container

---

### Section 1 — Hero

**Layout:** Centered, full-width, `py-20 md:py-28`

**Content (top to bottom):**

1. Eyebrow label:
   ```
   text: "Subscription sharing, reimagined"
   classes: text-xs font-medium uppercase tracking-widest text-primary mb-4
   ```

2. Headline (two lines):
   ```
   Line 1: "Pay only for"
   Line 2: "the slot you use."
   classes: text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-none
   ```
   "slot" is wrapped in `<span className="text-primary">slot</span>`

3. Subheadline:
   ```
   text: "SubSplit buys the subscription. You get a guaranteed, working slot at a fraction of the cost. No random users. No broken access. Just your slot."
   classes: text-base text-muted-foreground max-w-xl mx-auto mt-4 leading-relaxed
   ```

4. CTA buttons row (`flex gap-3 justify-center mt-8`):
   - Primary: `<Button size="lg">Browse plans</Button>` → navigates to `/plans`
   - Secondary: `<Button size="lg" variant="outline">See my savings</Button>` → smooth scrolls to `#savings-calculator`

5. Trust indicators row (`flex gap-6 justify-center mt-10 text-xs text-muted-foreground`):
   - `✓ SubSplit-owned accounts`
   - `✓ Instant slot access`
   - `✓ Cancel anytime`

---

### Section 2 — How it works

**ID:** `how-it-works`  
**Layout:** `py-16 border-t border-border`

**Section heading:**
```
"How SubSplit works"
classes: text-2xl font-semibold text-center text-foreground mb-2
```

**Subheading:**
```
"Three steps to start saving"
classes: text-sm text-muted-foreground text-center mb-12
```

**Three step cards** (`grid grid-cols-1 md:grid-cols-3 gap-6`):

Each card:
```tsx
<div className="bg-card border border-border rounded-lg p-6 text-center">
  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 text-sm font-bold">
    {step}
  </div>
  <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
</div>
```

Step 1: "Browse plans" — "Choose from Streaming, Education, Gaming, Productivity, or Music subscriptions."  
Step 2: "Pick your slot" — "See exactly how many slots are available and what you'll pay. Transparent pricing, always."  
Step 3: "Get instant access" — "Pay securely. Your slot is activated immediately. Cancel anytime."

---

### Section 3 — Savings Calculator

**ID:** `savings-calculator`  
**File:** `src/components/plans/SavingsCalculator.tsx`  
**Layout:** `py-16 border-t border-border`

**Section heading:** "See how much you save"

**Calculator card** (`bg-card border border-border rounded-xl p-6 md:p-8 max-w-2xl mx-auto`):

**Left column — subscription checkboxes:**
```
Label: "Select the subscriptions you use:"
classes: text-sm font-medium text-foreground mb-4
```

Each row: `flex items-center justify-between py-2 border-b border-border last:border-0`
- Left: `<Checkbox>` + subscription name (`text-sm text-foreground`)
- Right: solo price (`text-xs text-muted-foreground`)

Hardcoded subscription data (no API call):
```ts
const subscriptions = [
  { id: 1, name: "Netflix Premium",    solo: 649,  split: 199,  category: "Streaming" },
  { id: 2, name: "Spotify Family",     solo: 179,  split: 49,   category: "Music" },
  { id: 3, name: "Amazon Prime",       solo: 299,  split: 99,   category: "Streaming" },
  { id: 4, name: "Adobe Creative Cloud", solo: 4230, split: 1499, category: "Productivity" },
  { id: 5, name: "Microsoft 365",      solo: 489,  split: 119,  category: "Productivity" },
  { id: 6, name: "Coursera Plus",      solo: 3800, split: 999,  category: "Education" },
  { id: 7, name: "Xbox Game Pass",     solo: 499,  split: 169,  category: "Gaming" },
]
```

**Right column — live results:**

Three stat boxes (`grid grid-cols-3 gap-3 mt-6`):
```
Solo/year:         ₹{soloAnnual.toLocaleString('en-IN')}
SubSplit/year:     ₹{splitAnnual.toLocaleString('en-IN')}
You save/year:     ₹{savings.toLocaleString('en-IN')}
```

Savings row styling:
- Solo: `text-muted-foreground`
- SubSplit: `text-primary font-semibold`
- Savings: `text-success font-bold text-lg`

Savings percentage pill: `{pct}% saved` — `bg-success/10 text-success text-sm font-medium px-3 py-1 rounded-full`

**Interaction:** `onChange` on each checkbox recalculates all three values instantly. Use `useMemo` on the calculation. Wrap the savings number in `<motion.span key={savings}>` from Framer Motion for a count-up animation on change.

**CTA below calculator:**
```tsx
<Button className="w-full mt-6" size="lg" onClick={() => navigate('/signup')}>
  Start saving — create your account
</Button>
```

**Empty state (no checkboxes checked):**
- All three stat values show `₹0`
- Savings pill shows `0% saved`
- CTA button still visible

---

### Section 4 — Featured Plans Preview

**Layout:** `py-16 border-t border-border`

**Heading:** "Most popular plans"

Show 3 hardcoded plan cards (same `PlanCard` component used on browse page).  
Below cards: `<Button variant="outline">Browse all plans →</Button>` → `/plans`

---

### Section 5 — Trust Section

**Layout:** `py-16 border-t border-border bg-muted/30`

**Heading:** "Why SubSplit is different"

Four cards in a 2×2 grid:
1. "We own every account" — SubSplit purchases and manages all subscriptions directly.
2. "Transparent pricing" — See the exact math: subscription cost ÷ slots + our small fee.
3. "Slot guarantee" — If access breaks, we fix it or refund you. No excuses.
4. "Trust score system" — Your SubSplit Score rewards reliable users with waitlist priority.

---

## 4. Page: Browse Plans

**File:** `src/pages/BrowsePlansPage.tsx`  
**Route:** `/plans`  
**Auth:** None required

---

### Layout

```
[Page heading + subtitle]
[Category filter row]
[Plans grid]
```

**Page heading:**
```
"Browse subscription plans"
subtitle: "All plans are SubSplit-owned. Your slot is guaranteed."
```

---

### Category Filter Row

**File:** `src/components/plans/CategoryFilter.tsx`

`flex gap-2 flex-wrap mt-6 mb-8`

Each category pill:
```tsx
<button
  className={cn(
    "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-card text-muted-foreground border-border hover:border-primary/50"
  )}
>
  {label}
</button>
```

Categories: All · Streaming · Education · Gaming · Productivity · Music

**Interaction:** Clicking a category sets `selectedCategory` state. Triggers re-render of plans grid. `All` shows all plans. Only one active at a time.

---

### Plans Grid

**File:** `src/components/plans/PlanCard.tsx`

`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`

**Data:** Fetched via TanStack Query from `GET /api/plans?category={selected}`

#### PlanCard component

```tsx
<div className="bg-card border border-border rounded-lg relative overflow-hidden
                hover:ring-1 hover:ring-border transition-all duration-200 cursor-pointer"
     onClick={() => navigate(`/plans/${plan.id}`)}>

  {/* Brand accent bar */}
  <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />

  <div className="p-5 pt-6">

    {/* Header row */}
    <div className="flex items-start justify-between mb-3">
      <span className={cn("badge", categoryStyles[plan.category])}>
        {plan.category}
      </span>
      {/* Uptime badge */}
      <span className="flex items-center gap-1 text-xs text-success">
        <div className="w-1.5 h-1.5 rounded-full bg-success" />
        {plan.uptime_percentage}% uptime
      </span>
    </div>

    {/* Plan name */}
    <h3 className="text-base font-semibold text-foreground mb-1">{plan.name}</h3>

    {/* Slot grid */}
    <div className="flex gap-1.5 mb-1 mt-3">
      {Array.from({ length: plan.total_slots }).map((_, i) => (
        <SlotDot key={i} filled={i < plan.occupied_slots} />
      ))}
    </div>
    <p className="text-xs text-muted-foreground mb-4">
      {plan.available_slots} of {plan.total_slots} slots available
    </p>

    {/* Price */}
    <div className="flex items-baseline gap-1 mb-1">
      <span className="text-2xl font-bold tabular-nums text-foreground">
        ₹{(plan.user_pays_paise / 100).toFixed(0)}
      </span>
      <span className="text-sm text-muted-foreground">/mo per slot</span>
    </div>

    {/* Savings chip */}
    <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded">
      Save ₹{((plan.subscription_cost_paise - plan.user_pays_paise) / 100).toFixed(0)}/mo vs solo
    </span>

    {/* CTA */}
    <div className="mt-4">
      {plan.available_slots > 0 ? (
        <Button className="w-full" size="sm">Get this slot</Button>
      ) : (
        <Button className="w-full" size="sm" variant="outline">Join waitlist</Button>
      )}
    </div>
  </div>
</div>
```

**Interaction:** Clicking anywhere on the card (except the CTA button directly) navigates to `/plans/:id`. The CTA button also navigates to `/plans/:id` — checkout happens on the detail page.

---

### Loading State

Show 6 skeleton cards in the same grid:
```tsx
<div className="bg-card border border-border rounded-lg p-5 space-y-3">
  <Skeleton className="h-4 w-24" />      {/* category badge */}
  <Skeleton className="h-5 w-40" />      {/* plan name */}
  <div className="flex gap-1.5">
    {[1,2,3,4].map(i => <Skeleton key={i} className="w-2.5 h-2.5 rounded-sm" />)}
  </div>
  <Skeleton className="h-8 w-20" />      {/* price */}
  <Skeleton className="h-9 w-full" />    {/* button */}
</div>
```

### Empty State (no plans match category)

```tsx
<div className="col-span-3 flex flex-col items-center py-20 text-center">
  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
    <Search className="w-5 h-5 text-muted-foreground" />
  </div>
  <p className="text-base font-medium text-foreground mb-1">No plans in this category</p>
  <p className="text-sm text-muted-foreground">Check back soon — we're adding new plans regularly.</p>
  <Button variant="outline" className="mt-6" onClick={() => setCategory('ALL')}>
    View all plans
  </Button>
</div>
```

### Error State

```tsx
<div className="col-span-3 flex flex-col items-center py-20 text-center">
  <p className="text-sm text-destructive">Failed to load plans. Please try again.</p>
  <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
</div>
```

---

## 5. Page: Plan Detail + Checkout

**File:** `src/pages/PlanDetailPage.tsx`  
**Route:** `/plans/:id`  
**Auth:** None to view. User required to purchase.

---

### Layout

Two-column desktop layout:

```
[Left column — 60%]     [Right column — 40% sticky]
Plan info               Checkout card
Slot grid
Description
Access info
```

Mobile: Single column, checkout card appears below plan info.

Left column: `col-span-3 lg:col-span-2 space-y-6`  
Right column: `col-span-3 lg:col-span-1`  
Right column sticky wrapper: `sticky top-20`

---

### Left Column

#### Plan Header
```tsx
<div className="flex items-start gap-4">
  {/* Logo placeholder — rounded square with plan initial */}
  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center
                  text-primary text-xl font-bold border border-primary/20 flex-shrink-0">
    {plan.name[0]}
  </div>
  <div>
    <span className={cn("badge mb-2", categoryStyles[plan.category])}>
      {plan.category}
    </span>
    <h1 className="text-2xl font-semibold text-foreground">{plan.name}</h1>
    <div className="flex items-center gap-1 mt-1 text-xs text-success">
      <div className="w-1.5 h-1.5 rounded-full bg-success" />
      {plan.uptime_percentage}% uptime last 30 days
    </div>
  </div>
</div>
```

#### Slot Grid Visualization

**File:** `src/components/plans/SlotGrid.tsx`

```tsx
<div className="bg-card border border-border rounded-lg p-5">
  <h2 className="text-sm font-semibold text-foreground mb-4">
    Slot availability
  </h2>
  <div className="grid grid-cols-4 gap-3">
    {plan.slots.map((slot) => (
      <div
        key={slot.id}
        className={cn(
          "aspect-square rounded-lg border flex flex-col items-center justify-center text-xs font-medium",
          slot.status === "AVAILABLE"
            ? "border-dashed border-border bg-muted/30 text-muted-foreground"
            : "border-primary/30 bg-primary/5 text-primary"
        )}
      >
        {slot.status === "AVAILABLE" ? (
          <>
            <Plus className="w-4 h-4 mb-1" />
            <span>Open</span>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs
                           flex items-center justify-center font-semibold mb-1">
              {slot.user_initials}
            </div>
            <span>Slot {slot.slot_number}</span>
          </>
        )}
      </div>
    ))}
  </div>
  <p className="text-xs text-muted-foreground mt-3">
    {plan.available_slots} slot{plan.available_slots !== 1 ? 's' : ''} available
    out of {plan.total_slots} total
  </p>
</div>
```

#### Plan Description
```tsx
<div className="bg-card border border-border rounded-lg p-5">
  <h2 className="text-sm font-semibold text-foreground mb-3">About this plan</h2>
  <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
</div>
```

#### What you get (Access info — shown only when user holds a slot on this plan)
```tsx
<div className="bg-card border border-border rounded-lg p-5">
  <h2 className="text-sm font-semibold text-foreground mb-3">How to access</h2>
  <p className="text-sm text-muted-foreground leading-relaxed">
    {plan.access_instructions}
  </p>
</div>
```

---

### Right Column — Checkout Card

**File:** `src/components/plans/CheckoutCard.tsx`

```tsx
<div className="bg-card border border-border rounded-xl p-5 space-y-4">

  {/* Transparent pricing breakdown */}
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
      Pricing breakdown
    </p>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>{plan.name} ({plan.total_slots} slots)</span>
        <span>₹{(plan.subscription_cost_paise / 100).toFixed(0)}/mo</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>÷ Your slot cost</span>
        <span>₹{(plan.slot_cost_paise / 100).toFixed(0)}/mo</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>SubSplit platform fee</span>
        <span>+ ₹{(plan.platform_fee_paise / 100).toFixed(0)}</span>
      </div>
      <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
        <span>You pay</span>
        <span className="text-lg">₹{(plan.user_pays_paise / 100).toFixed(0)}/mo</span>
      </div>
    </div>
  </div>

  {/* Savings chip */}
  <div className="bg-success/10 text-success text-xs font-medium px-3 py-2 rounded-md">
    You save ₹{savings}/mo compared to buying solo
  </div>

  {/* CTA */}
  {plan.available_slots > 0 ? (
    <Button className="w-full" size="lg" onClick={handleGetSlot}>
      Get this slot — ₹{userPays}/mo
    </Button>
  ) : (
    <div className="space-y-2">
      <Button className="w-full" size="lg" variant="outline" onClick={handleJoinWaitlist}>
        Join waitlist
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {plan.waitlist_count} people waiting
      </p>
    </div>
  )}

  {/* Trust badges */}
  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
    {[
      { icon: Shield, label: "Secure payment" },
      { icon: Zap, label: "Instant access" },
      { icon: X, label: "Cancel anytime" },
    ].map(({ icon: Icon, label }) => (
      <div key={label} className="flex flex-col items-center gap-1 text-center">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    ))}
  </div>
</div>
```

---

### Payment Flow (Modal)

**File:** `src/components/plans/PaymentModal.tsx`  
**Trigger:** Clicking "Get this slot"

**If unauthenticated:** Redirect to `/login?redirect=/plans/:id`

**If authenticated:**

Open shadcn `<Dialog>`:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Confirm your slot</DialogTitle>
      <DialogDescription>
        You're getting a slot on {plan.name}
      </DialogDescription>
    </DialogHeader>

    {/* Summary */}
    <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Plan</span>
        <span className="text-foreground font-medium">{plan.name}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Slot</span>
        <span className="text-foreground font-medium">#{nextAvailableSlot}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-2">
        <span className="text-muted-foreground font-medium">Total today</span>
        <span className="text-foreground font-bold">₹{userPays}/mo</span>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handlePayment} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Pay ₹{userPays}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Payment steps:**
1. User clicks "Pay ₹{amount}"
2. Call `POST /api/payments/create-order` → get `razorpay_order_id`
3. Open Razorpay checkout modal (via `window.Razorpay`)
4. On Razorpay success callback: call `POST /api/payments/verify`
5. On verify success: close modal, show success toast, navigate to `/dashboard`
6. On any failure: show error toast, keep modal open

**Razorpay integration snippet:**
```ts
const options = {
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  amount: order.amount_paise,
  currency: "INR",
  name: "SubSplit",
  description: `Slot on ${plan.name}`,
  order_id: order.razorpay_order_id,
  handler: async (response) => {
    await verifyPayment(response)
  },
  prefill: { name: user.name, email: user.email },
  theme: { color: "#6C47FF" },
}
const rzp = new window.Razorpay(options)
rzp.open()
```

**Success state after payment:**
Show a success screen replacing the modal:
```tsx
<div className="flex flex-col items-center py-8 text-center">
  <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-4">
    <CheckCircle2 className="w-7 h-7 text-success" />
  </div>
  <h3 className="text-lg font-semibold text-foreground mb-1">Slot activated!</h3>
  <p className="text-sm text-muted-foreground mb-6">
    Your slot on {plan.name} is now active.
    Check your dashboard for access details.
  </p>
  <Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
</div>
```

---

### Waitlist flow (modal)

Same `<Dialog>` pattern. On join:
1. Call `POST /api/waitlist/join`
2. Show confirmation: "You're #N in the queue for {plan.name}"
3. Close modal

---

## 6. Page: Login

**File:** `src/pages/LoginPage.tsx`  
**Route:** `/login`  
**Auth:** Redirect to `/dashboard` if already authenticated

### Layout

Centered card on `bg-background` page. Card: `max-w-sm mx-auto bg-card border border-border rounded-xl p-8`

```
[SubSplit logo — centered]
[Heading: "Welcome back"]
[Subheading: "Log in to your SubSplit account"]
[Email field]
[Password field + show/hide toggle]
[Forgot password link — right aligned, non-functional for MVP]
[Log in button — full width, primary]
[Divider: "or"]
[Google OAuth button — outline, full width] ← non-functional for MVP, shown greyed out
[Signup link: "Don't have an account? Sign up"]
```

### Form fields

```tsx
// Email
<div className="space-y-1.5">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    {...register("email")}
    className={errors.email ? "border-destructive" : ""}
  />
  {errors.email && (
    <p className="text-xs text-destructive">{errors.email.message}</p>
  )}
</div>

// Password
<div className="space-y-1.5">
  <Label htmlFor="password">Password</Label>
  <div className="relative">
    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      placeholder="••••••••"
      {...register("password")}
    />
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      onClick={() => setShowPassword(!showPassword)}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
  {errors.password && (
    <p className="text-xs text-destructive">{errors.password.message}</p>
  )}
</div>
```

### Zod validation schema
```ts
const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})
```

### States

**Loading:** Submit button shows `<Loader2 className="w-4 h-4 animate-spin mr-2" />` and is disabled.

**Error:** Show a toast notification using shadcn `<Sonner>`:
- Invalid credentials: "Incorrect email or password"
- Account inactive: "Your account has been deactivated. Contact support."

**Success:** Store JWT + user in Zustand. Redirect to `?redirect` query param if present, else `/dashboard`.

---

## 7. Page: Signup

**File:** `src/pages/SignupPage.tsx`  
**Route:** `/signup`  
**Auth:** Redirect to `/dashboard` if already authenticated

Same layout as Login page.

```
[SubSplit logo]
[Heading: "Create your account"]
[Subheading: "Start saving on subscriptions today"]
[Name field]
[Email field]
[Password field + strength indicator]
[Confirm password field]
[Sign up button — full width, primary]
[Login link: "Already have an account? Log in"]
```

### Password strength indicator

Below the password field, visible when field has a value:

```tsx
const strength = getPasswordStrength(password) // 0 | 1 | 2 | 3

<div className="space-y-1 mt-1">
  <div className="flex gap-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={cn(
          "h-1 flex-1 rounded-full transition-colors",
          i < strength
            ? strength === 1 ? "bg-destructive"
              : strength === 2 ? "bg-warning"
              : "bg-success"
            : "bg-muted"
        )}
      />
    ))}
  </div>
  <p className="text-xs text-muted-foreground">
    {["", "Weak", "Medium", "Strong"][strength]}
  </p>
</div>
```

Strength logic:
- 1 (Weak): length < 8
- 2 (Medium): length >= 8, has letters + numbers
- 3 (Strong): length >= 12, has letters + numbers + special char

### Zod validation schema
```ts
const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
```

---

## 8. Page: User Dashboard

**File:** `src/pages/DashboardPage.tsx`  
**Route:** `/dashboard`  
**Auth:** User required — redirect to `/login?redirect=/dashboard` if unauthenticated

---

### Layout

```
[Dashboard heading row: "My dashboard" + user name]
[Score ring + quick stats row]
[Tabs: Active subscriptions | Payment history | Waitlist]
[Tab content area]
```

---

### Score Ring + Quick Stats

**File:** `src/components/dashboard/ScoreRing.tsx`

Top section: `flex flex-col md:flex-row gap-6 items-start`

**Score ring (left):**
```tsx
<div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
  {/* SVG circular progress */}
  <div className="relative w-20 h-20 flex-shrink-0">
    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
      {/* Background track */}
      <circle cx="40" cy="40" r="32" fill="none"
              stroke="currentColor" strokeWidth="6"
              className="text-muted" />
      {/* Progress arc */}
      <circle cx="40" cy="40" r="32" fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 201} 201`}
              className={cn(
                score >= 75 ? "text-success" :
                score >= 40 ? "text-warning" : "text-destructive"
              )}
              stroke="currentColor" />
    </svg>
    {/* Score number centered */}
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-xl font-bold text-foreground">{score}</span>
    </div>
  </div>

  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
      SubSplit Score
    </p>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {score >= 75
        ? "Excellent! You get priority on all waitlists."
        : score >= 40
        ? "Good standing. Keep payments on time to improve."
        : "At risk. Late payments reduce your waitlist priority."}
    </p>
    <button
      className="text-xs text-primary underline underline-offset-2 mt-2"
      onClick={() => setScoreInfoOpen(true)}
    >
      How is this calculated?
    </button>
  </div>
</div>
```

**Score info dialog:** Explains the scoring system (ON_TIME_PAYMENT +5, LATE_PAYMENT -5, SLOT_REVOKED -20) in plain language.

**Quick stats (right):** `grid grid-cols-3 gap-3`
- Active slots: count of OCCUPIED slots
- Total saved: cumulative savings vs solo pricing
- Member since: formatted `created_at`

---

### Tab Navigation

Use shadcn `<Tabs>` component:

```tsx
<Tabs defaultValue="subscriptions">
  <TabsList>
    <TabsTrigger value="subscriptions">
      Active subscriptions
      {activeCount > 0 && (
        <span className="ml-1.5 text-xs bg-primary text-primary-foreground
                         px-1.5 py-0.5 rounded-full">{activeCount}</span>
      )}
    </TabsTrigger>
    <TabsTrigger value="payments">Payment history</TabsTrigger>
    <TabsTrigger value="waitlist">
      Waitlist
      {waitlistCount > 0 && (
        <span className="ml-1.5 text-xs bg-muted text-muted-foreground
                         px-1.5 py-0.5 rounded-full">{waitlistCount}</span>
      )}
    </TabsTrigger>
  </TabsList>

  <TabsContent value="subscriptions"><ActiveSubscriptions /></TabsContent>
  <TabsContent value="payments"><PaymentHistory /></TabsContent>
  <TabsContent value="waitlist"><WaitlistTab /></TabsContent>
</Tabs>
```

---

### Tab 1 — Active Subscriptions

**File:** `src/components/dashboard/ActiveSlotCard.tsx`

`space-y-4`

Each slot card:
```tsx
<div className="bg-card border border-border rounded-lg p-5">
  <div className="flex items-start justify-between gap-4">
    {/* Left: plan info */}
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary
                      flex items-center justify-center font-bold text-sm border border-primary/20">
        {plan.name[0]}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{plan.name}</p>
        <span className={cn("badge", categoryStyles[plan.category])}>
          {plan.category}
        </span>
      </div>
    </div>

    {/* Right: status badge + slot number */}
    <div className="text-right flex-shrink-0">
      <span className={cn("badge", statusStyles[slot.status])}>
        {slot.status === "GRACE" ? "Grace period" : slot.status}
      </span>
      <p className="text-xs text-muted-foreground mt-1">Slot #{slot.slot_number}</p>
    </div>
  </div>

  {/* Dates row */}
  <div className="flex gap-6 mt-4 pt-4 border-t border-border">
    <div>
      <p className="text-xs text-muted-foreground">Since</p>
      <p className="text-sm text-foreground">{formatDate(slot.assigned_at)}</p>
    </div>
    <div>
      <p className="text-xs text-muted-foreground">Renews</p>
      <p className={cn("text-sm",
        slot.status === "GRACE" ? "text-warning font-medium" : "text-foreground"
      )}>
        {formatDate(slot.expires_at)}
      </p>
    </div>
    <div>
      <p className="text-xs text-muted-foreground">Monthly</p>
      <p className="text-sm text-foreground font-medium">
        ₹{(slot.plan.user_pays_paise / 100).toFixed(0)}
      </p>
    </div>
  </div>

  {/* Grace period warning */}
  {slot.status === "GRACE" && (
    <div className="mt-3 bg-warning/10 border border-warning/20 rounded-md p-3
                    text-xs text-warning">
      Your slot is in a grace period. Renew now to avoid losing your slot.
    </div>
  )}

  {/* Actions row */}
  <div className="flex gap-2 mt-4">
    <Button size="sm" variant="outline" onClick={() => setAccessOpen(true)}>
      Access details
    </Button>
    <Button size="sm" variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setCancelOpen(true)}>
      Cancel slot
    </Button>
  </div>

  {/* Access details collapsible */}
  {accessOpen && (
    <div className="mt-3 bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
      {slot.plan.access_instructions}
    </div>
  )}
</div>
```

**Cancel slot dialog:**
```tsx
<AlertDialog open={cancelOpen}>
  <AlertDialogContent>
    <AlertDialogTitle>Cancel your slot?</AlertDialogTitle>
    <AlertDialogDescription>
      Your slot on {plan.name} will be released immediately.
      No refund is issued for the current month. This action cannot be undone.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep my slot</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground"
        onClick={handleCancel}
      >
        Yes, cancel slot
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Empty state:**
```tsx
<div className="flex flex-col items-center py-16 text-center">
  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
    <Package className="w-6 h-6 text-muted-foreground" />
  </div>
  <p className="text-base font-medium text-foreground mb-1">No active subscriptions</p>
  <p className="text-sm text-muted-foreground mb-6">
    Browse plans to find your first slot.
  </p>
  <Button onClick={() => navigate('/plans')}>Browse plans</Button>
</div>
```

---

### Tab 2 — Payment History

**File:** `src/components/dashboard/PaymentHistory.tsx`

shadcn `<Table>`:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Date</TableHead>
      <TableHead>Plan</TableHead>
      <TableHead>Amount</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {payments.map((payment) => (
      <TableRow key={payment.id}>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(payment.created_at)}
        </TableCell>
        <TableCell className="text-sm font-medium text-foreground">
          {payment.plan.name}
        </TableCell>
        <TableCell className="text-sm tabular-nums text-foreground">
          ₹{(payment.amount_paise / 100).toFixed(0)}
        </TableCell>
        <TableCell>
          <span className={cn("badge", statusStyles[payment.status])}>
            {payment.status}
          </span>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Empty state:** "No payment history yet."

---

### Tab 3 — Waitlist

**File:** `src/components/dashboard/WaitlistTab.tsx`

`space-y-3`

Each waitlist card:
```tsx
<div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary
                    flex items-center justify-center font-bold text-sm">
      {plan.name[0]}
    </div>
    <div>
      <p className="text-sm font-semibold text-foreground">{plan.name}</p>
      <p className="text-xs text-muted-foreground">
        Position #{entry.queue_position} · Joined {formatDate(entry.joined_at)}
      </p>
    </div>
  </div>
  <Button size="sm" variant="ghost"
          className="text-destructive hover:text-destructive text-xs"
          onClick={() => handleLeaveWaitlist(plan.id)}>
    Leave
  </Button>
</div>
```

---

## 9. Page: Admin Dashboard

**File:** `src/pages/AdminPage.tsx`  
**Route:** `/admin`  
**Auth:** Admin required

---

### Layout

```
[Page heading: "Admin dashboard"]
[Top metric cards row]
[Two-column grid: Plans table (left) | At-risk slots (right)]
```

Admin pages use a sidebar navigation layout instead of the public navbar.

**Admin sidebar** (`src/components/admin/AdminSidebar.tsx`):
- Width: 220px, fixed left
- Links: Dashboard, Plans, Users, Analytics
- Active link: `bg-primary/10 text-primary font-medium`
- Inactive: `text-muted-foreground hover:text-foreground`
- Bottom: user name + "Log out" button

---

### Top Metric Cards

`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8`

Each metric card:
```tsx
<div className="bg-card border border-border rounded-lg p-4">
  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
    {label}
  </p>
  <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
  <p className="text-xs text-success mt-1">{delta}</p>
</div>
```

Four cards:
1. Monthly revenue — `₹48,230` — `+12% vs last month`
2. Slot utilization — `312 / 340` — `91.7% occupied`
3. Total users — `289` — `+24 this month`
4. Platform fee earned — `₹11,540` — `pure margin`

---

### Plans Table

shadcn `<Table>` in a card:

Columns: Plan name | Category | Slots | Utilization | Price/slot | Revenue | Status | Actions

```tsx
<TableRow key={plan.id}>
  <TableCell className="font-medium text-foreground">{plan.name}</TableCell>
  <TableCell>
    <span className={cn("badge", categoryStyles[plan.category])}>
      {plan.category}
    </span>
  </TableCell>
  <TableCell className="text-sm text-muted-foreground">
    {plan.occupied_slots}/{plan.total_slots}
  </TableCell>
  <TableCell>
    {/* Mini utilization bar */}
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${plan.utilization_percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {plan.utilization_percentage.toFixed(0)}%
      </span>
    </div>
  </TableCell>
  <TableCell className="tabular-nums text-sm">
    ₹{(plan.user_pays_paise / 100).toFixed(0)}
  </TableCell>
  <TableCell className="tabular-nums text-sm font-medium text-foreground">
    ₹{(plan.monthly_revenue_paise / 100).toFixed(0)}
  </TableCell>
  <TableCell>
    <Switch
      checked={plan.is_active}
      onCheckedChange={() => handleToggleActive(plan.id, !plan.is_active)}
    />
  </TableCell>
  <TableCell>
    <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/plans/${plan.id}`)}>
      Manage
    </Button>
  </TableCell>
</TableRow>
```

---

### At-Risk Slots Panel

Right column card (`space-y-3`):

Heading: "Slots needing attention"

Each at-risk row:
```tsx
<div className="flex items-center justify-between py-3 border-b border-border last:border-0">
  <div>
    <p className="text-sm font-medium text-foreground">{slot.user_name}</p>
    <p className="text-xs text-muted-foreground">{slot.plan_name}</p>
  </div>
  <div className="text-right">
    <span className={cn("badge", statusStyles[slot.status])}>
      {slot.status === "GRACE" ? "Grace period" : slot.status}
    </span>
    <p className="text-xs text-muted-foreground mt-0.5">
      Score: {slot.subsplit_score}
    </p>
  </div>
</div>
```

---

### Add Plan Button

Floating action in the top right of the plans section:
```tsx
<Button onClick={() => setAddPlanOpen(true)}>
  <Plus className="w-4 h-4 mr-2" />
  Add plan
</Button>
```

**Add plan dialog** (`src/components/admin/AddPlanDialog.tsx`):

shadcn `<Dialog>` with a form:

Fields:
- Plan name (Input)
- Category (Select: Streaming / Education / Gaming / Productivity / Music)
- Description (Textarea)
- Logo URL (Input, optional)
- Total slots (Input, type=number, min=1)
- Subscription cost in ₹ (Input, type=number — converted to paise on submit)
- Platform fee in ₹ (Input, type=number)
- Access instructions (Textarea)

**Live pricing preview** below the cost fields:
```tsx
<div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
  <div className="flex justify-between text-muted-foreground">
    <span>Slot cost</span>
    <span>₹{(cost / slots).toFixed(2)}/mo</span>
  </div>
  <div className="flex justify-between text-muted-foreground">
    <span>+ Platform fee</span>
    <span>₹{fee}/mo</span>
  </div>
  <div className="flex justify-between font-medium text-foreground border-t border-border pt-1">
    <span>User pays</span>
    <span>₹{(cost / slots + fee).toFixed(2)}/mo</span>
  </div>
</div>
```

On submit: `POST /api/admin/plans` → invalidate plans query → close dialog → show success toast.

---

## 10. Page: Admin Analytics

**File:** `src/pages/AdminAnalyticsPage.tsx`  
**Route:** `/admin/analytics`  
**Auth:** Admin required

---

### Layout

```
[Page heading: "Analytics"]
[Top metric cards — same 4 as dashboard]
[Two-column grid: Revenue by category chart (left) | Revenue trend chart (right)]
[Demand signals section — full width]
[Two-column grid: Score distribution (left) | Recent activity (right)]
```

---

### Revenue by Category Chart

**File:** `src/components/admin/RevenueByCategory.tsx`

Card with tab switcher inside:

```tsx
<div className="bg-card border border-border rounded-lg p-5">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-semibold text-foreground">Revenue by category</h3>
    <div className="flex gap-1">
      {["Revenue", "Utilization", "Users"].map((tab) => (
        <button
          key={tab}
          className={cn(
            "text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
            activeTab === tab
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  </div>

  {/* Horizontal bar chart using Recharts */}
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
      <XAxis type="number" tick={{ fontSize: 11 }} />
      <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
      <Tooltip
        formatter={(val) => activeTab === "Revenue" ? `₹${val.toLocaleString()}` : val}
        contentStyle={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          fontSize: "12px"
        }}
      />
      <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

---

### Revenue Trend Chart

**File:** `src/components/admin/RevenueTrend.tsx`

```tsx
<ResponsiveContainer width="100%" height={200}>
  <BarChart data={trendData}>
    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
    <YAxis tick={{ fontSize: 11 }}
           tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
    <Tooltip
      formatter={(val) => `₹${(val/100).toLocaleString('en-IN')}`}
      contentStyle={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        fontSize: "12px"
      }}
    />
    {/* Latest bar highlighted in primary, rest in primary/40 */}
    <Bar dataKey="revenue_rupees" radius={[4, 4, 0, 0]}
         fill="var(--primary)"
         fillOpacity={0.4}
    />
  </BarChart>
</ResponsiveContainer>
```

---

### Demand Signals Section

**File:** `src/components/admin/DemandSignals.tsx`

Full-width card:

Heading: "Demand signals — what users want next"  
Subheading: "Based on waitlist data and user preferences. Click 'Add plan' to queue a new plan."

`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4`

Each demand card:
```tsx
<div className="bg-card border border-border rounded-lg p-4">
  <div className="flex items-start justify-between mb-2">
    <div>
      <p className="text-sm font-semibold text-foreground">{signal.name}</p>
      <span className={cn("badge mt-1", categoryStyles[signal.category])}>
        {signal.category}
      </span>
    </div>
    <span className="text-xs font-bold text-primary">
      {signal.request_count} requests
    </span>
  </div>

  {/* Demand bar */}
  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
    <div
      className="h-full bg-primary rounded-full transition-all"
      style={{ width: `${(signal.request_count / maxRequests) * 100}%` }}
    />
  </div>

  <p className="text-xs text-muted-foreground mb-3">
    Est. margin: ₹{(signal.estimated_margin_paise / 100).toFixed(0)}/slot/mo
  </p>

  <Button
    size="sm"
    className="w-full"
    variant={added ? "ghost" : "outline"}
    disabled={added}
    onClick={() => handleAddPlan(signal)}
  >
    {added ? (
      <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Queued</>
    ) : (
      <><Plus className="w-3.5 h-3.5 mr-1.5" /> Add plan</>
    )}
  </Button>
</div>
```

**Interaction:** Clicking "Add plan" sets local `added` state to true (UI-only for demo). The button becomes "Queued" with a check icon and is disabled.

---

### Score Distribution

`grid grid-cols-3 gap-3`

```tsx
{[
  { label: "High (75–100)", count: 187, color: "text-success bg-success/10 border-success/20" },
  { label: "Medium (40–74)", count: 74,  color: "text-warning bg-warning/10 border-warning/20" },
  { label: "Low (0–39)",    count: 28,  color: "text-destructive bg-destructive/10 border-destructive/20" },
].map(({ label, count, color }) => (
  <div key={label} className={cn("rounded-lg border p-4 text-center", color)}>
    <p className="text-2xl font-bold tabular-nums">{count}</p>
    <p className="text-xs mt-1 opacity-80">{label}</p>
  </div>
))}
```

---

### Recent Activity

shadcn `<Table>` — last 10 events:

Columns: User | Action | Score | Time

```tsx
<TableRow key={i}>
  <TableCell>
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs
                      flex items-center justify-center font-semibold">
        {activity.user_initials}
      </div>
      <span className="text-sm text-foreground">{activity.user_name}</span>
    </div>
  </TableCell>
  <TableCell className="text-sm text-muted-foreground">{activity.action}</TableCell>
  <TableCell>
    <span className={cn("badge",
      activity.subsplit_score >= 75 ? statusStyles.ACTIVE :
      activity.subsplit_score >= 40 ? statusStyles.PENDING : statusStyles.REVOKED
    )}>
      {activity.subsplit_score}
    </span>
  </TableCell>
  <TableCell className="text-xs text-muted-foreground">
    {formatRelativeTime(activity.timestamp)}
  </TableCell>
</TableRow>
```

---

## 11. Page: Admin Plan Management

**File:** `src/pages/AdminPlanDetailPage.tsx`  
**Route:** `/admin/plans/:id`  
**Auth:** Admin required

---

### Layout

```
[Back link: "← Admin dashboard"]
[Plan header: name, category, status toggle]
[Two columns: Slot grid (left) | Plan settings form (right)]
[Waitlist section — full width below]
```

---

### Slot Grid (Admin View)

`grid grid-cols-2 md:grid-cols-4 gap-3`

Each slot tile (larger than public view):
```tsx
<div className={cn(
  "rounded-lg border p-3 space-y-2",
  slot.status === "AVAILABLE"  ? "border-dashed border-border bg-muted/20" :
  slot.status === "OCCUPIED"   ? "border-primary/30 bg-primary/5" :
  slot.status === "GRACE"      ? "border-warning/30 bg-warning/5" :
                                 "border-destructive/30 bg-destructive/5"
)}>
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-muted-foreground">
      Slot {slot.slot_number}
    </span>
    <span className={cn("badge text-[10px]", statusStyles[slot.status])}>
      {slot.status}
    </span>
  </div>

  {slot.user ? (
    <>
      <p className="text-xs font-medium text-foreground">{slot.user.name}</p>
      <p className="text-[10px] text-muted-foreground">{slot.user.email}</p>
      <p className="text-[10px] text-muted-foreground">
        Score: {slot.user.subsplit_score}
      </p>
      <p className="text-[10px] text-muted-foreground">
        Expires: {formatDate(slot.expires_at)}
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="w-full text-destructive hover:text-destructive text-xs h-7 mt-1"
        onClick={() => handleRevoke(slot.id)}
      >
        Revoke slot
      </Button>
    </>
  ) : (
    <p className="text-xs text-muted-foreground">Available</p>
  )}
</div>
```

**Revoke confirmation dialog:**
```tsx
<AlertDialog>
  <AlertDialogTitle>Revoke this slot?</AlertDialogTitle>
  <AlertDialogDescription>
    {user.name}'s slot will be revoked. Their SubSplit Score will decrease by 20.
    The next waitlisted user will be automatically promoted.
  </AlertDialogDescription>
</AlertDialog>
```

---

### Waitlist Section

Table with columns: Position | User | Email | Score | Joined

```tsx
<TableRow>
  <TableCell className="text-sm font-bold text-primary">#{entry.position}</TableCell>
  <TableCell className="text-sm text-foreground">{entry.user.name}</TableCell>
  <TableCell className="text-sm text-muted-foreground">{entry.user.email}</TableCell>
  <TableCell>
    <span className={cn("badge", scoreStyle(entry.user.subsplit_score))}>
      {entry.user.subsplit_score}
    </span>
  </TableCell>
  <TableCell className="text-xs text-muted-foreground">
    {formatDate(entry.joined_at)}
  </TableCell>
</TableRow>
```

---

## 12. Shared Components

### `src/components/ui/ThemeToggle.tsx`
```tsx
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

### `src/lib/utils.ts`
```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(dateStr))
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function paise_to_rupees(paise: number): number {
  return Math.round(paise) / 100
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
}
```

### `src/store/authStore.ts`
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
}

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'ADMIN',
    }),
    { name: 'subsplit-auth' }
  )
)
```

---

## 13. State Patterns

### TanStack Query pattern for every API call

```ts
// src/hooks/usePlans.ts
import { useQuery } from '@tanstack/react-query'
import { getPlans } from '@/api/plans'

export function usePlans(category?: string) {
  return useQuery({
    queryKey: ['plans', category],
    queryFn: () => getPlans(category),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}
```

### Loading state pattern
```tsx
if (isLoading) return <PlanCardSkeleton count={6} />
if (isError) return <ErrorState onRetry={refetch} />
if (!data?.plans.length) return <EmptyState />
return <PlanGrid plans={data.plans} />
```

### Mutation pattern (for create/update)
```ts
const { mutate, isPending } = useMutation({
  mutationFn: createOrder,
  onSuccess: (data) => {
    toast.success('Order created')
    openRazorpay(data)
  },
  onError: (error) => {
    toast.error(getErrorMessage(error))
  },
})
```

### Toast notifications (shadcn Sonner)
```tsx
// src/main.tsx — add once at root level
import { Toaster } from 'sonner'
// Inside JSX:
<Toaster position="top-right" richColors />

// Usage anywhere:
import { toast } from 'sonner'
toast.success("Slot activated!")
toast.error("Payment failed. Please try again.")
```

---

## 14. Routing and Protection

### `src/App.tsx`
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/plans" element={<BrowsePlansPage />} />
        <Route path="/plans/:id" element={<PlanDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected: User */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />

        {/* Protected: Admin */}
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />
        <Route path="/admin/analytics" element={
          <AdminRoute><AdminAnalyticsPage /></AdminRoute>
        } />
        <Route path="/admin/plans/:id" element={
          <AdminRoute><AdminPlanDetailPage /></AdminRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## 15. API Integration Layer

### `src/api/client.ts`
```ts
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — clear auth and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || 'Something went wrong'
  }
  return 'Something went wrong'
}
```

### `src/api/plans.ts`
```ts
import { apiClient } from './client'

export const getPlans = async (category?: string) => {
  const params = category && category !== 'ALL' ? { category } : {}
  const { data } = await apiClient.get('/plans', { params })
  return data.data
}

export const getPlan = async (id: string) => {
  const { data } = await apiClient.get(`/plans/${id}`)
  return data.data
}
```

### `src/api/payments.ts`
```ts
import { apiClient } from './client'

export const createOrder = async (planId: string) => {
  const { data } = await apiClient.post('/payments/create-order', { plan_id: planId })
  return data.data
}

export const verifyPayment = async (payload: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}) => {
  const { data } = await apiClient.post('/payments/verify', payload)
  return data.data
}

export const getMyPayments = async () => {
  const { data } = await apiClient.get('/payments/my')
  return data.data
}
```

### `src/types/index.ts`
```ts
export interface Plan {
  id: string
  name: string
  category: 'STREAMING' | 'EDUCATION' | 'GAMING' | 'PRODUCTIVITY' | 'MUSIC'
  description: string
  logo_url: string | null
  total_slots: number
  subscription_cost_paise: number
  platform_fee_paise: number
  slot_cost_paise: number
  user_pays_paise: number
  available_slots: number
  occupied_slots: number
  uptime_percentage: number
  is_active: boolean
  created_at: string
}

export interface PlanDetail extends Plan {
  access_instructions: string | null
  slots: SlotPreview[]
}

export interface SlotPreview {
  id: string
  slot_number: number
  status: SlotStatus
  user_initials: string | null
}

export interface Slot {
  id: string
  slot_number: number
  status: SlotStatus
  assigned_at: string | null
  expires_at: string | null
  plan: Plan & { access_instructions: string | null }
}

export type SlotStatus = 'AVAILABLE' | 'OCCUPIED' | 'GRACE' | 'REVOKED'

export interface Payment {
  id: string
  amount_paise: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  failure_reason: string | null
  created_at: string
  plan: { id: string; name: string; category: string }
}

export interface WaitlistEntry {
  id: string
  queue_position: number
  joined_at: string
  plan: Plan
}

export interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  is_active: boolean
  subsplit_score: number
  created_at: string
}

export interface ScoreEvent {
  id: string
  event_type: string
  delta: number
  description: string | null
  created_at: string
}
```

---

*End of UI Specification Document — SubSplit v1.0 MVP*
