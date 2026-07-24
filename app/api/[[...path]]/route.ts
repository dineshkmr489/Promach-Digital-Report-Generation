import { handleApiRequest } from "../../../server/api.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(request);
}

export function POST(request: Request): Promise<Response> {
  return handleApiRequest(request);
}

export function PUT(request: Request): Promise<Response> {
  return handleApiRequest(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handleApiRequest(request);
}
