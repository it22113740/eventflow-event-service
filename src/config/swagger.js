const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EventFlow — Event Service API",
      version: "1.0.0",
      description: "Manages events for the EventFlow platform. JWT issued by the User Service is required for protected routes.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3003}`,
        description: "Local development",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Event: {
          type: "object",
          properties: {
            _id: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            title: { type: "string", example: "Tech Summit 2025" },
            description: { type: "string", example: "Annual technology summit." },
            date: { type: "string", format: "date-time", example: "2025-09-15T09:00:00.000Z" },
            location: { type: "string", example: "Colombo Convention Centre" },
            category: { type: "string", example: "Technology" },
            capacity: { type: "integer", example: 500 },
            createdBy: { type: "string", example: "user-uuid-123" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
