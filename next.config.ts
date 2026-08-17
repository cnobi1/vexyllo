import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default 1MB is too small for uploaded script files (PDF/DOCX) or long
      // pastes. Was briefly raised to 50mb to fit admin showcase video
      // uploads, but those now go straight from the browser to Storage
      // (src/app/admin/_components/showcase-form.tsx) instead of through a
      // Server Action, so this only needs to cover script uploads again.
      bodySizeLimit: "8mb",
    },
  },
};

export default withWorkflow(nextConfig);
