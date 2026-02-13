"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, getDocFromServer } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { Purchases } from "@revenuecat/purchases-js";

import { MapStyleOptions } from "./map-styles";

const REVENUECAT_API_KEY = "test_UcfvVtEKTneUKCOYsCUAEYYHvLX";

interface UserData {
  invitesRemaining: number;
  vector: string | null;
  phoneNumber: string | null;
  didInvite: boolean;
  displayName: string | null;
  photoURL: string | null;
  theme?: string;
  mapSettings?: MapStyleOptions;
  invitedBy?: string | null;
  isBuilder?: boolean;
  location?: { lat: number; lng: number };
  incognito?: boolean;
  email?: string | null;
  vibeActive?: boolean;
  vibeProfile?: {
    age: number | null;
    description: string;
    vehicle: string;
    badge: string;
    photos: string[];
  };
  vibeLikesReceived?: number;
  isPro?: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isPro: boolean;
  proLoading: boolean;
  proDetails: {
    planName: string;
    expirationDate: string | null; // null = lifetime
    activeEntitlement: string;
  } | null;
  refreshUserData: () => Promise<void>;
  refreshProStatus: () => Promise<void>;
  saveTheme: (theme: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isPro: false,
  proLoading: true,
  proDetails: null,
  refreshUserData: async () => { },
  refreshProStatus: async () => { },
  saveTheme: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [proDetails, setProDetails] = useState<AuthContextType["proDetails"]>(null);
  const [proLoading, setProLoading] = useState(true);

  // Apply theme to DOM
  const applyTheme = (theme: string | null | undefined) => {
    if (!theme || theme === "yellow") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  };

  // Check RevenueCat entitlements for pro status
  const checkProStatus = useCallback(async (userId: string, firestoreSaysPro: boolean = false) => {
    try {
      if (!Purchases.isConfigured()) {
        Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserId: userId });
      }
      const purchases = Purchases.getSharedInstance();
      const customerInfo = await purchases.getCustomerInfo();
      const activeEntitlements = customerInfo.entitlements.active;
      const hasActiveEntitlements = Object.keys(activeEntitlements).length > 0;

      const actuallyPro = hasActiveEntitlements || firestoreSaysPro;

      console.log("[AuthProvider] checkProStatus", {
        hasActiveEntitlements,
        firestoreSaysPro,
        act: activeEntitlements
      });

      setIsPro(actuallyPro);

      if (hasActiveEntitlements) {
        // Get the first active entitlement (usually 'pro')
        const ent = Object.values(activeEntitlements)[0];
        setProDetails({
          planName: ent.productIdentifier, // e.g., rc_lifetime_3999
          expirationDate: ent.expirationDate ? new Date(ent.expirationDate).toISOString() : null,
          activeEntitlement: ent.identifier
        });
      } else if (firestoreSaysPro) {
        // If only Firestore says Pro (e.g. lifetime synced but RC offline), allow it but maybe with less detail
        setProDetails({
          planName: "Convoy Pro",
          expirationDate: null, // Assume lifetime or unknown if only relying on simple bool
          activeEntitlement: "firestore_fallback"
        });
      } else {
        setProDetails(null);
      }
    } catch (error) {
      console.error("Error checking pro status:", error);
      // Fallback: If RC fails, trust Firestore
      if (firestoreSaysPro) {
        setIsPro(true);
        setProDetails({
          planName: "Convoy Pro (Offline Mode)",
          expirationDate: null,
          activeEntitlement: "firestore_backup"
        });
      } else {
        setIsPro(false);
        setProDetails(null);
      }
    } finally {
      setProLoading(false);
    }
  }, []);

  // Function to fetch/ensure user data in Firestore
  // Every Firebase Auth user MUST have a corresponding Firestore doc
  const fetchUserData = async (firebaseUser: User) => {
    try {
      const docRef = doc(db, "users", firebaseUser.uid);
      // FORCE SERVER FETCH to ensure we get the latest 'isPro' status if it was just updated by a server action
      const docSnap = await getDocFromServer(docRef);

      // Fields that should always stay in sync with Firebase Auth
      const authFields = {
        email: firebaseUser.email || null,
        phoneNumber: firebaseUser.phoneNumber || null,
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
      };

      if (docSnap.exists()) {
        // Existing user — merge auth fields so cross-references stay fresh
        const data = docSnap.data() as UserData;
        const needsSync =
          data.email !== authFields.email ||
          data.phoneNumber !== authFields.phoneNumber ||
          (!data.displayName && authFields.displayName) ||
          (!data.photoURL && authFields.photoURL);

        if (needsSync) {
          await setDoc(docRef, authFields, { merge: true });
        }

        setUserData({ ...data, ...authFields });
        if (data.isPro) setIsPro(true); // Immediate update from DB
        applyTheme(data.theme);
        return { ...data, ...authFields };
      } else {
        // Brand-new user — create full doc
        const initialData: UserData = {
          invitesRemaining: 1,
          vector: null,
          didInvite: false,
          theme: "yellow",
          ...authFields,
        };
        await setDoc(docRef, initialData);
        setUserData(initialData);
        applyTheme("yellow");
        return initialData;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  const saveTheme = async (newTheme: string) => {
    if (!user) return;
    try {
      // 1. Update Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { theme: newTheme });

      // 2. Update Local State
      setUserData((prev) => prev ? { ...prev, theme: newTheme } : null);

      // 3. Update DOM
      applyTheme(newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const data = await fetchUserData(user);
        await checkProStatus(user.uid, !!data?.isPro);
      } else {
        setUserData(null);
        setIsPro(false);
        setProLoading(false);
        applyTheme("yellow"); // Reset to default on logout
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [checkProStatus]); // checkProStatus is now stable (empty deps)

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  const refreshProStatus = useCallback(async () => {
    if (user) {
      setProLoading(true);
      // FORCE FETCH latest data from Firestore to ensure we see the 'isPro' update
      // from the server action that just ran.
      const freshData = await fetchUserData(user);
      await checkProStatus(user.uid, !!freshData?.isPro);
    }
  }, [user, checkProStatus]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isPro, proLoading, proDetails, refreshUserData, refreshProStatus, saveTheme }}>
      {children}
    </AuthContext.Provider>
  );
}
