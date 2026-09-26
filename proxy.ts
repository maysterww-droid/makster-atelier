import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0];

  if (hostname === "maksteratelier.com") {
    const destination = request.nextUrl.clone();
    destination.protocol = "https:";
    destination.hostname = "www.maksteratelier.com";
    destination.port = "";
    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
