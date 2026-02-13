# Firebase Operations Index

This file tracks all Firebase interaction points in the codebase, categorization by Server Action vs Client SDK, and the associated Firestore Security Rules status.

## 🟢 Client Side (Direct SDK)
These operations are performed directly from the client using `firebase/firestore`.
**Security Check:** Must be covered by `firestore.rules`.

| Component / File | Operation | Collection | Logic / Rule Status |
| :--- | :--- | :--- | :--- |
| `auth-provider.tsx` | `fetchUserData` | `users/{uid}` | Read: Own doc. Write: Auth fields (merge). Allowed. |
| `auth-provider.tsx` | `saveTheme` | `users/{uid}` | Update: `theme`. Allowed. |
| `map-view.tsx` | `updateLocation` | `users/{uid}` | Update: `location`, `lastLocationUpdate`. Allowed. |
| `vibe/page.tsx` | `listenToMatches` | `vibe-likes` | Read: Where `to == uid`. Allowed. |
| **[NEW]** `user-menu.tsx` | `updateProfile` | `users/{uid}` | Update: `vibeProfile`, `vibeActive`. **Allowed** |
| **[NEW]** `vibe/page.tsx` | `recordInteraction` | `vibe-interactions` | Write: Own doc. **Allowed** |
| **[NEW]** `vibe/page.tsx` | `sendMessage` | `vibe-messages` | Write: Subcollection. **Allowed** |
| **[NEW]** `chat-dialog.tsx` | `sendMessage` | `vibe-messages` | Write: Subcollection. **Allowed** |

## 🛡️ Server Actions (Admin SDK)
These operations interact with the Service Account. Kept on server for security or complexity.

| File | Function | Purpose | Reason for Server Side |
| :--- | :--- | :--- | :--- |
| `subscription-actions.ts` | `syncSubscriptionAction` | Store RevenueCat data | **Security**: Trusted environment to set `isPro`. |
| `invite-actions.ts` | `createInviteAction` | Create invite | **Integrity**: Enforce `invitesRemaining` logic. |
| `upload-actions.ts` | `getSignedURL` | Generate upload URL | **Security**: Requires secret. |

## 🔒 Firestore Rules Status
**Required Changes:**
1.  ALLOW `vibeProfile`, `vibeActive` update in `users`.
2.  ALLOW write to `vibe-interactions/{userId}` for owner.
3.  ALLOW write to `vibe-messages` for participants.
