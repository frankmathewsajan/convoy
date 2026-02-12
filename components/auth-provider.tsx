"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

import { MapStyleOptions } from "./map-styles";

interface UserData {
  invitesRemaining: number;
  vector: string | null;
  phoneNumber: string | null;
  didInvite: boolean;
  displayName: string | null;
  photoURL: string | null;
  theme?: string;
  mapSettings?: MapStyleOptions;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  saveTheme: (theme: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUserData: async () => { },
  saveTheme: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply theme to DOM
  const applyTheme = (theme: string | null | undefined) => {
    if (!theme || theme === "yellow") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  };

  // Function to fetch user data from Firestore
  const fetchUserData = async (firebaseUser: User) => {
    try {
      const docRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        setUserData(data);
        applyTheme(data.theme);
      } else {
        // Initialize new user data if not exists
        const initialData: UserData = {
          invitesRemaining: 1, // Default 1 invite
          vector: null,
          phoneNumber: null,
          didInvite: false,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          theme: "yellow",
        };
        await setDoc(docRef, initialData);
        setUserData(initialData);
        applyTheme("yellow");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
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
        await fetchUserData(user);
      } else {
        setUserData(null);
        applyTheme("yellow"); // Reset to default on logout
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData, saveTheme }}>
      {children}
    </AuthContext.Provider>
  );
}
