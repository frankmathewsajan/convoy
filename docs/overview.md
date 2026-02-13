# Convoy - Van Life Connection Platform

## Overview
Convoy is an invite-only, safety-first networking platform designed specifically for van-life travelers and digital nomads. It enables travelers living and moving in vans to discover nearby nomads in real time, match based on shared travel direction, and interact through a swipe-based discovery system.

## Core Features

### 1. The Vibe Zone (Geofenced Discovery)
- **Radius:** Users can see others within a **150-mile radius**.
- **Privacy:** Exact locations are **never shared**. Distance is shown in vague terms (e.g., "Nearby" or "Heading North").
- **Vibe Check:** Users set a "Vibe" status (e.g., "Focus Mode," "Looking for Convoy," "Beer o'clock") to signal availability.

### 2. Convoy Vectors (Directional Matching)
- **Algorithm:** Matches users who are heading in the same general cardinal direction (e.g., both heading NW).
- **Goal:** To form "Convoys"—groups of nomads traveling together for safety and companionship.

### 3. Safety & Verification (The "Grandfather" System)
- **Invite-Only:** New users must be verified by an existing member.
- **Trust Score:** Users build reputation through positive interactions and "Vouches" from others.

### 4. Builder Protocol (Service Marketplace)
- **Skill Swap:** Find nomads with specific skills (e.g., Solar installation, Diesel mechanics, Starlink setup).
- **Vetted Network:** Service providers are community-verified.

## Technical Architecture

### Frontend (User App)
- **Framework:** React Native / Expo (for mobile app), Web (landing page).
- **Styling:** "Neo-Brutalism" design (High contrast, bold typography, vibrant colors).

### Backend
- **Platform:** Google Cloud Platform (Cloud Run).
- **Database:** Firebase Firestore (NoSQL).
- **Auth:** Firebase Authentication.

### Static Hosting
- **Hosting:** Firebase Hosting.
- **Content:** Landing pages (`index.html`), Documentation (`technical.html`, `proposal.html`).

## Development Roadmap
1.  **MVP Phase:** Core Vibe Zone, Basic Auth, and Profile Management.
2.  **Growth Phase:** Vector Matching Algorithm, Invite System.
3.  **Monetization:** "Convoy+" subscription (Offline maps, Unlimited invites, Builder access).

## Documentation
- [Technical Documentation](https://convoy-shipyard.web.app/technical)
- [Written Proposal](https://convoy-shipyard.web.app/proposal)