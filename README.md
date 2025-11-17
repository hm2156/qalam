# Qalam — Arabic Publishing Engine (Next.js + Supabase)

A production-ready Arabic writing and publishing platform built with **Next.js**, **Supabase**, and a fully custom **RTL TipTap editor**.

Engineered for performance, editorial workflows, and secure multi-user content creation.

---

## Overview

Qalam is an Arabic-first publishing platform with a complete editorial workflow, secure authentication, and dynamic content delivery. It includes a custom writing experience, social features, and a moderation layer suitable for real-world production use.

---

## Features

**Content & Editorial Workflow**

* Arabic-optimized TipTap editor with custom RTL behavior

* Draft → pending review → publish/reject pipeline

* Reviewer dashboard with comment threads on submissions

**User & Social Layer**

* Profiles with social links and author pages

* Threaded comments, likes, bookmarks, and follows

* Email notifications (Brevo SMTP) for new followers and publishing updates

**Authentication**

* Supabase Auth with **Google OAuth**

* Email/Magic Link sign-in (via Supabase Auth)

* Server-side session validation and protected routes

**SEO & Performance**

* Server-rendered article pages with dynamic metadata

* Parallel data fetching with `Promise.all()`

* Reduced payloads via selective field projection

---

## Tech Stack

**Next.js (App Router + Server Components)**

* Minimal client-side JavaScript

* Server Actions for type-safe mutations

* Strong SEO performance for article pages

**Supabase (PostgreSQL + Auth)**

* Relational schema with strict Row Level Security

* Built-in Google OAuth + Email/Magic Link authentication

* Auto-generated PostgREST API

* Designed for secure, scalable multi-user publishing

**TipTap Rich Text Editor**

* Based on ProseMirror for granular document control

* Custom RTL alignment and Arabic writing rules

* Extensions for images, tables, code, quotes, and links

**Email Delivery**

* Nodemailer with SMTP configuration

* Brevo SMTP for transactional emails

* HTML email templates with RTL support

---

## Engineering Highlights

* Parallelized database queries using `Promise.all()`

* Optimized Postgres indexes for comment and feed queries

* Server Components for SSR data loading

* Clean React + TypeScript component architecture

* RLS-secured workflows for authors, reviewers, and public users

* Server Actions for type-safe data mutations

* Batch data aggregation with Map-based lookups

---

## Data Model (High-Level)

```
profiles

articles          (status: draft | pending_review | published | rejected)

comments          (threaded via parent_id)

likes

bookmarks

profile_follows   (with notification preferences)

notification_events (async email delivery queue)
```

---

## Project Structure

```
app/
  article/[slug]      # Server-rendered article pages
  publish/            # Editor flow
  dashboard/          # Reviewer tools
  explore/            # Feed
  author/[id]         # Profiles
  api/
    articles/         # Article review endpoints
    notifications/    # Notification processing
lib/
  supabase/           # Client, server, and admin clients
  notifications/      # Email delivery (Nodemailer)
types/                # TypeScript interfaces
```

---

## Security Model

* Row Level Security on all tables

* Users may only modify their own content

* Reviewer-only permissions for moderation

* Server-side session validation (`@supabase/ssr`)

* Sanitization of all user-generated HTML

* Protected API routes with role-based access

---

## Deployment

* Hosted on **Vercel**

* Supabase for database, authentication, and storage

* Environment secrets managed via Vercel

* Zero-downtime deployments

---

## Planned Enhancements

* Supabase Storage for article images

* Real-time comments and notifications

* Full-text Arabic search

* Version history and collaborative editing

---
