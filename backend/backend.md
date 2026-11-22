# ACORN2PROTEIN – Backend Development Prompt

Act as a Senior Backend Engineer specialized in Node.js, Express.js, MongoDB, IoT systems, and scalable REST API architectures.

I want you to design and implement the complete backend for a project called **ACORN2PROTEIN**, an intelligent IoT-based mealworm farming monitoring system.

Your task is to build a clean, modular, maintainable, and scalable backend using **Node.js, Express.js, MongoDB, and Mongoose**, following the **MVC (Model-View-Controller) architecture**.

Do not generate a basic CRUD application. Build a backend suitable for a real IoT prototype.

---

# 1. Project Context

ACORN2PROTEIN is an AgriTech project that aims to explore the use of flour produced from cork oak acorns (Quercus suber) as an experimental ingredient in the feed of mealworm larvae (Tenebrio molitor).

The first prototype consists of one smart rearing tray containing mealworm larvae.

The system integrates:

- ESP32 DevKit for embedded monitoring and control.
- DHT22 for temperature and humidity measurement.
- RGB LED for local status indication.
- Flame sensor for auxiliary safety detection.
- Buzzer for local alarms.
- OLED display for local information.
- SG90 servo motor for controlling a small ventilation flap.
- USB camera connected to a PC for larval image monitoring.
- Python FastAPI service for Computer Vision processing.
- Next.js frontend dashboard for monitoring and management.

The backend is the central application layer connecting the ESP32, MongoDB, FastAPI, and Next.js dashboard.

# 2. Technology Stack

Use the following technologies:

- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB
- ODM: Mongoose
- Architecture: MVC
- Authentication: JWT
- Password hashing: bcrypt
- Validation: Zod or express-validator
- Real-time communication: Socket.IO
- Logging: Winston or Pino
- API documentation: Swagger / OpenAPI
- Security: Helmet, CORS, express-rate-limit
- Environment configuration: dotenv

Use JavaScript ES Modules (import/export).

# 3. Architecture Requirements

Implement a modular MVC architecture with separation of responsibilities.

Use the following project structure:

```text
acorn2protein-backend/
│
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── environment.js
│   │   └── socket.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Device.js
│   │   ├── Tray.js
│   │   ├── SensorReading.js
│   │   ├── Alert.js
│   │   ├── Experiment.js
│   │   ├── FeedFormula.js
│   │   ├── FeedingEvent.js
│   │   ├── Observation.js
│   │   ├── Image.js
│   │   └── ImageAnalysis.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── deviceController.js
│   │   ├── trayController.js
│   │   ├── telemetryController.js
│   │   ├── alertController.js
│   │   ├── experimentController.js
│   │   ├── feedFormulaController.js
│   │   ├── feedingEventController.js
│   │   ├── observationController.js
│   │   ├── imageController.js
│   │   └── analyticsController.js
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── telemetryService.js
│   │   ├── alertService.js
│   │   ├── deviceService.js
│   │   ├── experimentService.js
│   │   ├── analyticsService.js
│   │   ├── socketService.js
│   │   └── fastapiService.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── deviceRoutes.js
│   │   ├── trayRoutes.js
│   │   ├── telemetryRoutes.js
│   │   ├── alertRoutes.js
│   │   ├── experimentRoutes.js
│   │   ├── feedFormulaRoutes.js
│   │   ├── feedingEventRoutes.js
│   │   ├── observationRoutes.js
│   │   ├── imageRoutes.js
│   │   └── analyticsRoutes.js
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── deviceAuthMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── validateMiddleware.js
│   │   └── notFoundMiddleware.js
│   │
│   ├── validators/
│   │   ├── authValidator.js
│   │   ├── telemetryValidator.js
│   │   ├── deviceValidator.js
│   │   └── experimentValidator.js
│   │
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── generateToken.js
│   │   └── logger.js
│   │
│   ├── app.js
│   └── server.js
│
├── tests/
├── docs/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

You may improve this structure if necessary, but preserve the MVC separation.

# 4. MongoDB Database Design

Create Mongoose schemas with proper references, indexes, validation, timestamps, and relationships.

## 4.1 User Model

Fields:

- username
- email (unique)
- password
- role (admin, researcher, operator)
- isActive
- createdAt
- updatedAt

Implement secure password hashing and JWT authentication.

## 4.2 Device Model

Represents the ESP32 device.

Fields:

- deviceId (unique)
- name
- deviceType
- tray (reference to Tray)
- firmwareVersion
- connectionStatus (online, offline)
- lastSeen
- registeredAt

## 4.3 Tray Model

Represents the physical mealworm rearing container.

Fields:

- trayCode (unique)
- name
- description
- status
- startDate
- larvaeInitialCount
- feedFormula (reference to FeedFormula)
- createdAt
- updatedAt

The initial prototype contains only one tray, but the schema must support multiple trays in future versions.

## 4.4 SensorReading Model

Store all ESP32 measurements.

Fields:

- device (reference to Device)
- tray (reference to Tray)
- temperature
- humidity
- flameDetected
- servoAngle
- systemStatus
- recordedAt

Requirements:

- Store timestamps.
- Add indexes on tray, device, and recordedAt.
- Support filtering by date range.
- Support pagination.
- Never overwrite historical sensor readings.

## 4.5 Alert Model

Fields:

- tray
- device
- alertType (temperature, humidity, flame, sensor_error, device_offline)
- severity (info, warning, critical)
- message
- status (active, acknowledged, resolved)
- createdAt
- resolvedAt

Generate alerts when configured safety or environmental conditions are violated.

Avoid creating duplicate alerts for the same persistent condition. Implement alert deduplication and recovery logic.

## 4.6 Experiment Model

Fields:

- name
- objective
- description
- startDate
- endDate
- status
- trays (references)
- methodology
- results
- notes

The experiment should allow researchers to track the impact of experimental acorn flour formulations.

## 4.7 FeedFormula Model

Fields:

- name
- acornFlourPercentage
- otherIngredients
- description
- nutritionalAnalysis
- tanninAnalysis
- notes

Do not assume that a formulation is nutritionally safe or validated. Store laboratory results separately from experimental assumptions.

## 4.8 FeedingEvent Model

Fields:

- tray
- feedFormula
- quantityGrams
- feedingDate
- notes

## 4.9 Observation Model

Fields:

- tray
- observationDate
- larvaeCount
- estimatedBiomassGrams
- mortalityCount
- developmentStage
- notes

These measurements may be entered manually by the researcher.

## 4.10 Image Model

Fields:

- tray
- imagePath
- filename
- capturedAt
- source (camera, manual_upload)
- analysisStatus

## 4.11 ImageAnalysis Model

Fields:

- image
- tray
- jobId
- status (pending, processing, completed, failed)
- larvaeCount
- detections
- modelVersion
- confidence
- processingTimeMs
- resultJson
- createdAt

Do not fabricate computer vision results. Store null values when no validated model or result exists.

# 5. ESP32 Integration – IoT Telemetry API

The ESP32 sends sensor readings to the Node.js backend using HTTP POST initially.

Implement:

POST /api/v1/telemetry

Example payload:

```json
{
  "deviceId": "ESP32_TRAY_01",
  "trayCode": "TRAY_01",
  "temperature": 26.5,
  "humidity": 65.2,
  "flameDetected": false,
  "servoAngle": 0,
  "systemStatus": "NORMAL"
}
```

Requirements:

1. Validate the device identity.
2. Validate all incoming values.
3. Validate temperature and humidity ranges.
4. Save the reading in MongoDB.
5. Update the device lastSeen timestamp.
6. Update device connection status.
7. Evaluate alert conditions using configurable thresholds.
8. Create or resolve alerts.
9. Emit real-time updates using Socket.IO.
10. Return a clear JSON response.

Example response:

```json
{
  "success": true,
  "message": "Telemetry received successfully",
  "data": {
    "deviceId": "ESP32_TRAY_01",
    "recordedAt": "2026-11-21T18:00:00.000Z"
  }
}
```

Implement a separate device authentication mechanism using a per-device API key or token. Do not expose device credentials in dashboard requests.

Also implement:

- POST /api/v1/devices/heartbeat
- GET /api/v1/devices
- GET /api/v1/devices/:id
- GET /api/v1/telemetry/latest
- GET /api/v1/telemetry/history

# 6. Real-Time Communication

Integrate Socket.IO.

The backend must emit:

- sensor:update
- device:status
- alert:new
- alert:resolved
- image:analysis:completed

The Next.js dashboard should be able to receive live updates without continuously polling the API.

Use appropriate Socket.IO authentication and room organization by tray or authorized user.

# 7. FastAPI Computer Vision Integration

The Python FastAPI service runs separately from the Node.js backend.

Node.js must communicate with FastAPI using HTTP.

FastAPI base URL:

FASTAPI_BASE_URL=http://localhost:8000

Implement a dedicated fastapiService.js.

Expected endpoints on FastAPI:

- GET /health
- POST /api/v1/images/analyze
- GET /api/v1/jobs/:jobId

Responsibilities:

1. Register image metadata in MongoDB.
2. Send image analysis requests to FastAPI.
3. Handle processing status.
4. Retrieve analysis results.
5. Store results in ImageAnalysis.
6. Associate each image and analysis with the correct tray.
7. Notify the frontend using Socket.IO.

Implement request timeouts, error handling, and retry policies where appropriate.

Do not block normal telemetry processing while image analysis is running.

# 8. REST API Modules

Implement the following routes:

### Authentication
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me

### Devices
- GET /api/v1/devices
- GET /api/v1/devices/:id
- POST /api/v1/devices
- PATCH /api/v1/devices/:id

### Trays
- GET /api/v1/trays
- POST /api/v1/trays
- GET /api/v1/trays/:id
- PATCH /api/v1/trays/:id

### Telemetry
- POST /api/v1/telemetry
- GET /api/v1/telemetry/latest
- GET /api/v1/telemetry/history

### Alerts
- GET /api/v1/alerts
- GET /api/v1/alerts/:id
- PATCH /api/v1/alerts/:id/acknowledge
- PATCH /api/v1/alerts/:id/resolve

### Experiments
- GET /api/v1/experiments
- POST /api/v1/experiments
- GET /api/v1/experiments/:id
- PATCH /api/v1/experiments/:id

### Feed Formulas
- GET /api/v1/feed-formulas
- POST /api/v1/feed-formulas
- GET /api/v1/feed-formulas/:id

### Feeding Events
- GET /api/v1/feeding-events
- POST /api/v1/feeding-events

### Observations
- GET /api/v1/observations
- POST /api/v1/observations

### Images and Computer Vision
- POST /api/v1/images
- POST /api/v1/images/:id/analyze
- GET /api/v1/images/:id
- GET /api/v1/images/:id/analysis

### Analytics
- GET /api/v1/analytics/overview
- GET /api/v1/analytics/environment
- GET /api/v1/analytics/growth
- GET /api/v1/analytics/feeding

# 9. Analytics Requirements

Implement aggregation services for:

- Average temperature.
- Minimum and maximum temperature.
- Average humidity.
- Environmental history.
- Number of active alerts.
- Device online/offline status.
- Feeding history.
- Larvae observations.
- Biomass evolution when actual measurements exist.
- Feed conversion ratio (FCR) only when valid feed intake and biomass gain measurements are available.

Support daily, weekly, and custom date ranges.

Never calculate scientific metrics from missing or fabricated data.

# 10. Security and Reliability

Implement:

- JWT authentication.
- Role-based access control.
- Password hashing with bcrypt.
- Device API key authentication.
- Helmet.
- CORS configuration.
- Rate limiting.
- Request validation.
- Centralized error handling.
- Secure environment variables.
- Structured logging.
- MongoDB indexes.
- Pagination.
- Input sanitization.
- File upload validation and size limits.

Never expose database credentials or API keys in responses or logs.

# 11. API Documentation and Testing

Use Swagger/OpenAPI to document all endpoints.

Provide:

- Unit tests for services.
- Integration tests for telemetry.
- Authentication tests.
- Validation tests.
- Device authorization tests.
- FastAPI integration tests using mocked responses.
- Example Postman collection.

Test important edge cases:

- Unknown device.
- Missing fields.
- Invalid sensor values.
- Duplicate telemetry.
- Database unavailable.
- FastAPI unavailable.
- Device disconnected.
- Persistent alerts.
- Recovery after alert resolution.

# 12. Environment Configuration

Create a complete .env.example:

```env
NODE_ENV=development
PORT=4000

MONGODB_URI=mongodb://127.0.0.1:27017/acorn2protein

JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=1d

FASTAPI_BASE_URL=http://localhost:8000

CORS_ORIGIN=http://localhost:3000

DEVICE_API_KEY_SECRET=replace_with_secure_secret

SOCKET_CORS_ORIGIN=http://localhost:3000
```

# 13. Development Workflow

Implement the project incrementally.

Follow this order:

Phase 1:
- Initialize Node.js project.
- Configure Express.
- Configure MongoDB and Mongoose.
- Implement MVC architecture.
- Configure centralized error handling.

Phase 2:
- Implement User authentication.
- Implement Device and Tray models.
- Implement device authentication.

Phase 3:
- Implement ESP32 telemetry endpoint.
- Save sensor readings.
- Implement alert generation.
- Test with Postman before connecting the real ESP32.

Phase 4:
- Integrate Socket.IO.
- Implement live telemetry updates.

Phase 5:
- Implement experiments, feed formulas, feeding events and observations.

Phase 6:
- Integrate FastAPI Computer Vision service.

Phase 7:
- Implement analytics and Swagger documentation.

# 14. Important Development Rules

- Use clean and readable code.
- Follow MVC architecture strictly.
- Keep business logic in services, not controllers.
- Keep controllers thin.
- Use reusable middleware.
- Use async/await.
- Use centralized error handling.
- Use consistent API response structures.
- Use meaningful variable and function names.
- Avoid duplicated logic.
- Do not put all code in one file.
- Do not create unnecessary abstractions.
- Do not implement fake integrations.
- Do not invent sensor readings or AI results.
- Do not generate the entire project in one enormous code block.

Before implementing, inspect the architecture and explain the responsibilities of each module.

Then create the project incrementally, starting with the configuration, database connection, Express application, server initialization, and basic health endpoint.

After each phase:
1. Explain what was implemented.
2. Show the created files.
3. Explain how to run the backend.
4. Provide commands to test the endpoints.
5. Wait for approval before moving to the next major phase.

**Final objective:** Deliver a production-minded, modular Node.js backend for ACORN2PROTEIN that reliably connects the ESP32 prototype, MongoDB database, FastAPI Computer Vision service, and Next.js dashboard.