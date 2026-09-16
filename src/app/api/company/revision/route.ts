import { getAuthContext } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export async function GET(){
  const auth=await getAuthContext();
  if(!auth)return Response.json({error:"Sessão encerrada"},{status:401});
  const revision=await prisma.$queryRaw<Array<{kind:string;count:bigint;changed:Date|null}>>`
    SELECT 'plans' AS kind, COUNT(*) AS count, MAX("updatedAt") AS changed FROM "ActionPlan" WHERE "companyId"=${auth.companyId}
    UNION ALL SELECT 'tasks', COUNT(*), MAX("updatedAt") FROM "Task" WHERE "companyId"=${auth.companyId}
    UNION ALL SELECT 'checkins', COUNT(*), MAX("updatedAt") FROM "ProgressCheckin" WHERE "companyId"=${auth.companyId}
    UNION ALL SELECT 'evidence', COUNT(*), MAX("createdAt") FROM "EvidenceOutput" WHERE "companyId"=${auth.companyId}
    UNION ALL SELECT 'artifacts', COUNT(*), MAX("updatedAt") FROM "WorkspaceArtifact" WHERE "companyId"=${auth.companyId}`;
  return Response.json({revision:revision.map(row=>`${row.kind}:${row.count}:${row.changed?.toISOString()??""}`).join("|")},{headers:{"Cache-Control":"no-store"}});
}
