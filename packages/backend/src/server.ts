// Server entry point for Kirocred backend API
// This file starts the Express server for the hosted service

import { createServer } from "./api/server";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

async function main() {
  try {
    // Create Express app
    const app = createServer();

    // Start server
    app.listen(PORT, () => {
      console.log("🚀 Kirocred Backend API");
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log("");
      console.log("Available endpoints:");
      console.log("  POST /api/organizations/register");
      console.log("  POST /api/credentials/issue");
      console.log("  POST /api/batches/process");
      console.log("  POST /api/credentials/revoke");
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully...");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully...");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
main();
