import "server-only";

import { cache } from "react";
import { DEV_COMPANY_ID } from "@/core/development";
import { prisma } from "@/lib/prisma";

export const getDevCompany = cache(async () => {
  const company = await prisma.company.findUnique({
    where: { id: DEV_COMPANY_ID },
  });

  if (!company) {
    throw new Error(
      "Empresa de desenvolvimento não encontrada. Execute pnpm db:seed.",
    );
  }

  return company;
});



