UPDATE "Company" AS company
SET "onboardingStatus" = 'COMPLETED', "updatedAt" = CURRENT_TIMESTAMP
WHERE company."onboardingStatus" = 'IN_PROGRESS'
  AND EXISTS (
    SELECT 1
    FROM "DiagnosticSession" AS diagnostic
    WHERE diagnostic."companyId" = company.id
      AND diagnostic.status = 'COMPLETED'
  );
