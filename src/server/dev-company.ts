import "server-only";

import { cache } from "react";
import { requireAuth } from "@/server/auth";

export const getDevCompany = cache(async () => {
  return (await requireAuth()).company;
});



