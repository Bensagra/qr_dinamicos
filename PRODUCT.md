# Product

<!-- impeccable:product-schema 1 -->

## Platform
web (Android Chrome for NFC) plus an iPhone companion app with native Core NFC.

## Stack
Delegated by the user: Next.js and Supabase; deployment target Vercel.

## Users
Owner-operated panel for multiple venues, managing dynamic QR codes, short links, external menu redirects, and NFC tags.

## Product Purpose
Create QR codes whose destinations can change without reprinting. Scanning redirects directly to the configured destination.

## Capabilities and Constraints
Spanish panel; live QR preview; color, shape and logo customization. Persistent database required for deployed dynamic redirects. User can provision database. Credentials, public domain, Apple signing team, and deployment are not supplied. Local development should be usable before configuration.

One stable short URL powers each record’s QR and NFC. Each venue may have one designated external-menu link. No menus or public content are hosted in the app. NFC permanent write protection must be explicit; pausing a redirect remains reversible.

## Brand Commitments
User approved a clear, compact panel with live preview. Working name: QR Studio (implementation assumption).

## Product Principles
Keep printed codes stable. Make destination editing explicit. Never present local-only links as published. Protect management access.
