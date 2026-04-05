# PurchaseFlow - Setup Guide

A multi-user purchase control system to track every step of your purchase orders — from offer inquiry to warehouse acceptance.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** and fill in the details
3. Wait for the project to be provisioned (~2 minutes)

## 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste and click **Run**
4. This creates all tables, policies, realtime subscriptions, and triggers

## 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in your Supabase project: **Settings → API**

## 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add the environment variables in Vercel project settings
4. Deploy!

Also set the Supabase Auth redirect URL:
- Supabase dashboard → **Authentication → URL Configuration**
- Add: `https://your-vercel-domain.vercel.app/auth/callback`

---

## User Roles

| Role              | Capabilities |
|-------------------|-------------|
| **Admin**         | Full access, manage users and all steps |
| **Purchaser**     | Create/manage purchases, quotations, orders, payments, shipping |
| **Warehouse Manager** | Receive goods, inspect and accept/reject deliveries |
| **Finance**       | Manage proforma invoices and payments |

The first registered user should be promoted to **Admin** manually in the Supabase table editor (`profiles` table).

---

## Purchase Order Steps

1. **Purchase Request** — Initial request with specs and quantity needed
2. **Offer / Quotation** — Suppliers contacted, quotes compared, offer selected
3. **Order Placement** — PO sent to supplier, confirmation received
4. **Proforma Invoice** — PI received, approved internally
5. **Payment** — Bank transfer executed, confirmed by supplier
6. **Loading / Dispatch** — Goods loaded at supplier facility
7. **Shipping & Transport** — Transport company, tracking number, ETA
8. **Customs Clearance** — Customs declaration, duties, release
9. **Arrival at Factory** — Truck arrived, delivery note
10. **Warehouse Inspection** — QC inspection, accept or reject
11. **Completed** — All done, final invoice filed

Every step has its own data fields and a **notes** section for free-text comments. All changes are visible to all logged-in users in **real time**.

---

## Real-Time Updates

The app uses **Supabase Realtime** — when any user updates a step, adds a note, or changes a status, all other users currently viewing that purchase order will see the update instantly (no page refresh needed). A "Live" indicator appears when updates are received.
