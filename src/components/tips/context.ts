"use client";

import { createContext } from "react";

/** True once PrivyRoot has loaded in the browser and Privy's hooks are safe to call. */
export const TipsReady = createContext(false);
