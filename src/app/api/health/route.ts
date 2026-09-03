export function GET() {
  return Response.json({
    status: "ok",
    service: "fabrica-agil",
    timestamp: new Date().toISOString(),
  });
}


