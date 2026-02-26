import request from "supertest";
import { createServer, setupErrorHandling } from "./server";
import router from "./routes";

describe("API Endpoints", () => {
  let app: any;

  beforeAll(() => {
    app = createServer();
    app.use(router);
    setupErrorHandling(app);
  });

  describe("POST /api/credentials/issue", () => {
    it("should return validation error for missing fields", async () => {
      const response = await request(app)
        .post("/api/credentials/issue")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Validation Error");
    });

    it("should return validation error for invalid UUID", async () => {
      const response = await request(app)
        .post("/api/credentials/issue")
        .send({
          holderPublicKey: "0x123",
          credentialId: "invalid-uuid",
          attributes: { name: "test" },
          issuerSignedMessage: "0x456",
          issuerPublicKey: "0x789",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain(
        "credentialId must be a valid UUIDv4",
      );
    });
  });

  describe("POST /api/batches/process", () => {
    it("should return validation error for missing fields", async () => {
      const response = await request(app).post("/api/batches/process").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Validation Error");
    });

    it("should return validation error for invalid batch structure", async () => {
      const response = await request(app).post("/api/batches/process").send({
        batchId: "invalid-uuid",
        credentials: "not-an-array",
        issuerPublicKey: "0x123",
        batchMetadata: {},
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain("batchId must be a valid UUIDv4");
      expect(response.body.details).toContain(
        "credentials is required and must be an array",
      );
    });
  });

  describe("POST /api/credentials/revoke", () => {
    it("should return validation error for missing fields", async () => {
      const response = await request(app)
        .post("/api/credentials/revoke")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Validation Error");
    });

    it("should return validation error for invalid commitment format", async () => {
      const response = await request(app).post("/api/credentials/revoke").send({
        commitment: "invalid-hex",
        batchId: "invalid-uuid",
        reason: "test",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain(
        "commitment must be a valid hex string",
      );
      expect(response.body.details).toContain("batchId must be a valid UUIDv4");
    });
  });

  describe("Health check", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("404 handler", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/unknown-route");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Not Found");
    });
  });
});
