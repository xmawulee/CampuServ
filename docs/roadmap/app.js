/**
 * CampusServ Project Roadmap Dashboard Logic
 * Group 88 · KNUST
 */

// --- 151 Tasks Data Set Definition ---
const ROADMAP_DATA = [
  {
    phase: 1,
    phaseName: "Phase 1: Lay the Groundwork",
    phaseDesc: "Define roles, agree on tools, create repository structure, and align on CampusServ details.",
    subcategories: [
      {
        name: "Team & roles",
        tasks: [
          { name: "Assign a project lead, backend lead, frontend lead, and database lead within Group 88", discipline: "Business" },
          { name: "Set up a shared communication channel (WhatsApp group or Slack) for daily standups", discipline: "Business" },
          { name: "Define contribution expectations — minimum hours/week, PR review SLA, deadlines", discipline: "Business" }
        ]
      },
      {
        name: "Tooling & environment",
        tasks: [
          { name: "Create a GitHub organisation or repo with a clear folder structure: /backend, /mobile, /docs", discipline: "DevOps" },
          { name: "Agree on branching strategy: main → dev → feature/xxx → PRs into dev", discipline: "DevOps" },
          { name: "Set up IntelliJ IDEA (backend) and VS Code or WebStorm (frontend) with shared formatter configs", discipline: "DevOps" },
          { name: "Install Node.js LTS, Expo CLI, and JDK 17 on all team members' machines", discipline: "DevOps" },
          { name: "Create a shared .env.example with all required environment variable keys (no secrets committed)", discipline: "DevOps" }
        ]
      },
      {
        name: "Documentation",
        tasks: [
          { name: "Write a one-page README explaining the project, stack, and how to run it locally", discipline: "Business" },
          { name: "Create a Figma workspace and share with all team members", discipline: "Design" },
          { name: "Finalise and document the 7 service categories with descriptions and example use cases", discipline: "Business" }
        ]
      }
    ]
  },
  {
    phase: 2,
    phaseName: "Phase 2: Screen Design & Prototyping",
    phaseDesc: "Design every screen in Figma using a shared component library before coding begins to prevent rework.",
    subcategories: [
      {
        name: "Design system",
        tasks: [
          { name: "Define a color palette, typography scale, and spacing system in Figma", discipline: "Design" },
          { name: "Create reusable components: buttons, inputs, cards, bottom tabs, avatars, badges", discipline: "Design" },
          { name: "Design a consistent icon set (Material Icons or a custom set)", discipline: "Design" }
        ]
      },
      {
        name: "Screen designs",
        tasks: [
          { name: "Onboarding screens: Splash, Register, Email Verification, Student ID Upload, Login, Password Reset", discipline: "Design" },
          { name: "Home screen: personalised feed, nearby requests, top providers by category", discipline: "Design" },
          { name: "Browse screen: searchable directory with filters by category, price range, rating", discipline: "Design" },
          { name: "Post request flow: category selection → description + deadline + location + file attach", discipline: "Design" },
          { name: "Provider profile screen: bio, portfolio gallery, ratings, active services, reviews", discipline: "Design" },
          { name: "Offer management screen: list of offers, provider cards, accept/decline actions", discipline: "Design" },
          { name: "Job tracker screen: active jobs, status timeline, proof upload, confirmation button", discipline: "Design" },
          { name: "Chat screen: real-time messaging thread between requester and provider", discipline: "Design" },
          { name: "Payment screen: Paystack checkout integration, escrow confirmation", discipline: "Design" },
          { name: "Wallet screen: balance, pending escrow, transaction history, withdrawal flow", discipline: "Design" },
          { name: "Dispute screen: raise dispute, evidence upload, status tracking", discipline: "Design" },
          { name: "Review & rating screen: submit review after job completion", discipline: "Design" },
          { name: "Admin panel: pending verifications list, open disputes, user management", discipline: "Design" }
        ]
      },
      {
        name: "Prototype & review",
        tasks: [
          { name: "Link screens in Figma to create a clickable prototype of the core user journey", discipline: "Design" },
          { name: "Conduct a usability walkthrough with 2–3 KNUST students (not team members) and note friction points", discipline: "Design" },
          { name: "Revise designs based on feedback before moving to Phase 3", discipline: "Design" }
        ]
      }
    ]
  },
  {
    phase: 3,
    phaseName: "Phase 3: Cloud & Database Infrastructure",
    phaseDesc: "Provision the cloud infrastructure and define the entire database schema using Flyway migrations.",
    subcategories: [
      {
        name: "Cloud & infrastructure",
        tasks: [
          { name: "Provision a PostgreSQL instance on Supabase, Railway, or Render (free tier for dev)", discipline: "DevOps" },
          { name: "Set up an AWS S3 bucket (or Cloudinary) for file storage: student IDs, portfolios, job proofs", discipline: "DevOps" },
          { name: "Create a RabbitMQ instance (CloudAMQP free tier) for async messaging between microservices", discipline: "DevOps" },
          { name: "Register a Paystack account and obtain test API keys (requires Ghana bank account)", discipline: "Business" }
        ]
      },
      {
        name: "Schema design",
        tasks: [
          { name: "Write Flyway migration V1: users table with all columns, constraints, and indexes", discipline: "Database" },
          { name: "Write Flyway migration V2: service_categories, provider_profiles, provider_services tables", discipline: "Database" },
          { name: "Write Flyway migration V3: service_requests, request_attachments tables", discipline: "Database" },
          { name: "Write Flyway migration V4: offers table with FK to requests and users", discipline: "Database" },
          { name: "Write Flyway migration V5: jobs, job_proofs tables", discipline: "Database" },
          { name: "Write Flyway migration V6: transactions table (escrow flow)", discipline: "Database" },
          { name: "Write Flyway migration V7: reviews, disputes, notifications tables", discipline: "Database" },
          { name: "Seed the database with the 7 service categories and test users", discipline: "Database" },
          { name: "Validate all FK constraints, indexes on frequently queried columns (userId, requestId)", discipline: "Database" }
        ]
      }
    ]
  },
  {
    phase: 4,
    phaseName: "Phase 4: Backend Microservice Development",
    phaseDesc: "Build each Spring Boot microservice in dependency order with unit tests.",
    subcategories: [
      {
        name: "Project scaffold",
        tasks: [
          { name: "Initialise a Spring Boot parent project with Maven/Gradle multi-module structure", discipline: "Backend" },
          { name: "Add Spring Cloud Gateway module and configure routing rules for all services", discipline: "Backend" },
          { name: "Set up Eureka Service Registry and register all services for dynamic discovery", discipline: "Backend" },
          { name: "Configure Docker Compose with containers for each service, PostgreSQL, and RabbitMQ", discipline: "DevOps" }
        ]
      },
      {
        name: "Auth service",
        tasks: [
          { name: "Implement POST /auth/register with university email validation (must end in @st.knust.edu.gh or configured domain)", discipline: "Backend" },
          { name: "Implement POST /auth/login returning a signed JWT (access token 15min, refresh token 7d)", discipline: "Backend" },
          { name: "Implement student ID photo upload endpoint — store to S3, set isVerified = false until admin approves", discipline: "Backend" },
          { name: "Implement POST /auth/refresh to exchange a valid refresh token for a new access token", discipline: "Backend" },
          { name: "Implement POST /auth/logout (blacklist refresh token)", discipline: "Backend" },
          { name: "Add JWT validation filter in API Gateway — reject all requests without valid token (except /auth/**)", discipline: "Backend" },
          { name: "Write unit tests for registration validation, JWT generation, and token refresh logic", discipline: "Backend" }
        ]
      },
      {
        name: "User service",
        tasks: [
          { name: "Implement GET /users/{id} to fetch public profile (name, rating, completed jobs count)", discipline: "Backend" },
          { name: "Implement PUT /users/{id}/profile for updating bio, profile photo, contact info", discipline: "Backend" },
          { name: "Implement POST /providers/{id}/services — add a service category + base price to a provider profile", discipline: "Backend" },
          { name: "Implement GET /providers — list all providers, filterable by category, rating, campus location", discipline: "Backend" },
          { name: "Implement portfolio endpoints: POST/DELETE /providers/{id}/portfolio", discipline: "Backend" }
        ]
      },
      {
        name: "Request service",
        tasks: [
          { name: "Implement POST /requests — create a new service request with category, description, deadline, location, files", discipline: "Backend" },
          { name: "Implement GET /requests — paginated list of all open requests, filterable by category and location", discipline: "Backend" },
          { name: "Implement GET /requests/{id} — full detail of a single request including attachments", discipline: "Backend" },
          { name: "Implement POST /requests/{id}/offers — provider submits an offer (price, ETA, message)", discipline: "Backend" },
          { name: "Implement PUT /requests/{id}/offers/{offerId}/accept — requester accepts an offer, triggers job creation", discipline: "Backend" },
          { name: "Implement PUT /requests/{id}/offers/{offerId}/decline", discipline: "Backend" },
          { name: "Implement DELETE /requests/{id} — requester cancels request (only if no offer accepted yet)", discipline: "Backend" }
        ]
      },
      {
        name: "Job service",
        tasks: [
          { name: "Implement GET /jobs — list all jobs for the authenticated user (as requester or provider)", discipline: "Backend" },
          { name: "Implement GET /jobs/{id} — full job detail with status timeline", discipline: "Backend" },
          { name: "Implement POST /jobs/{id}/proofs — provider uploads completion proof (images/files to S3)", discipline: "Backend" },
          { name: "Implement PUT /jobs/{id}/complete — requester confirms job done, triggers payment release", discipline: "Backend" },
          { name: "Implement PUT /jobs/{id}/dispute — either party raises a dispute", discipline: "Backend" },
          { name: "Publish RabbitMQ event on every job status change (for Notification Service)", discipline: "Backend" }
        ]
      },
      {
        name: "Payment service",
        tasks: [
          { name: "Integrate Paystack: implement POST /payments/initiate to create a Paystack charge and return the checkout URL", discipline: "Backend" },
          { name: "Implement Paystack webhook endpoint to receive payment confirmation and update escrow status", discipline: "Backend" },
          { name: "Implement escrow hold logic: mark transaction as HELD after successful payment", discipline: "Backend" },
          { name: "Implement fund release: on job completion, deduct 12% service charge, transfer net to provider wallet", discipline: "Backend" },
          { name: "Implement GET /wallet — return wallet balance and pending escrow amounts", discipline: "Backend" },
          { name: "Implement POST /wallet/withdraw — provider withdraws to MoMo or bank via Paystack Transfer API", discipline: "Backend" },
          { name: "Implement refund logic for cancelled jobs and full-refund dispute resolutions", discipline: "Backend" },
          { name: "Write integration tests for the full payment → escrow → release flow using Paystack test mode", discipline: "Backend" }
        ]
      },
      {
        name: "Supporting services",
        tasks: [
          { name: "Chat service: set up Spring WebSocket (STOMP) for real-time messaging, persist messages to DB", discipline: "Backend" },
          { name: "Review service: implement POST/GET /reviews — submit and retrieve reviews after job completion", discipline: "Backend" },
          { name: "Review service: implement rating aggregation — update provider's average rating on each new review", discipline: "Backend" },
          { name: "Dispute service: implement dispute lifecycle — RAISED → EVIDENCE → UNDER_REVIEW → RESOLVED", discipline: "Backend" },
          { name: "Notification service: subscribe to RabbitMQ queue, dispatch Expo push notifications on key events", discipline: "Backend" },
          { name: "Notification service: key events — new offer received, offer accepted, job completed, payment released, dispute raised", discipline: "Backend" }
        ]
      }
    ]
  },
  {
    phase: 5,
    phaseName: "Phase 5: Expo Mobile App Development",
    phaseDesc: "Build the Expo React Native app using TypeScript, React Query, Zustand, and React Navigation.",
    subcategories: [
      {
        name: "Project setup",
        tasks: [
          { name: "Initialise Expo project with TypeScript template and configure path aliases", discipline: "Frontend" },
          { name: "Set up React Navigation v6: Stack navigator (auth flow) + Bottom Tab navigator (main app)", discipline: "Frontend" },
          { name: "Install and configure Axios with an interceptor that attaches the JWT and handles 401 token refresh", discipline: "Frontend" },
          { name: "Set up React Query (TanStack Query) as the primary data-fetching layer", discipline: "Frontend" },
          { name: "Create a shared component library: Button, Input, Card, Avatar, Badge, BottomSheet, Skeleton loader", discipline: "Frontend" },
          { name: "Set up AsyncStorage or Expo SecureStore for persisting tokens", discipline: "Frontend" }
        ]
      },
      {
        name: "Auth screens",
        tasks: [
          { name: "Implement Register screen with form validation (email must be university domain)", discipline: "Frontend" },
          { name: "Implement Email OTP Verification screen", discipline: "Frontend" },
          { name: "Implement Student ID upload screen using Expo ImagePicker", discipline: "Frontend" },
          { name: "Implement Login screen with 'Remember me' option", discipline: "Frontend" },
          { name: "Implement Password Reset flow (request reset → enter OTP → new password)", discipline: "Frontend" },
          { name: "Implement auth state persistence: auto-login on app launch if token is valid", discipline: "Frontend" }
        ]
      },
      {
        name: "Core screens",
        tasks: [
          { name: "Home screen: fetch and display active nearby requests, top-rated providers, active jobs strip", discipline: "Frontend" },
          { name: "Browse screen: infinite scroll list of requests, filter sheet by category/price/deadline", discipline: "Frontend" },
          { name: "Post request screen: multi-step form — category → details → location picker → file attach → submit", discipline: "Frontend" },
          { name: "Provider list screen: grid of provider cards with rating, service tags, and completion rate", discipline: "Frontend" },
          { name: "Provider profile screen: bio, portfolio gallery (FlatList with pinch-zoom), reviews, 'Submit offer' CTA", discipline: "Frontend" },
          { name: "Request detail screen: request info + list of received offers + accept/decline actions", discipline: "Frontend" },
          { name: "My jobs screen: tabs for Active / Completed / Disputed jobs, each with a status timeline", discipline: "Frontend" },
          { name: "Job detail screen: proof upload (provider), completion confirm (requester), raise dispute button", discipline: "Frontend" }
        ]
      },
      {
        name: "Payments & wallet",
        tasks: [
          { name: "Integrate Paystack React Native SDK or WebView checkout for card and MoMo payments", discipline: "Frontend" },
          { name: "Implement payment confirmation screen after escrow initiation", discipline: "Frontend" },
          { name: "Wallet screen: balance card, pending escrow section, transaction history FlatList", discipline: "Frontend" },
          { name: "Withdrawal flow: enter MoMo number / bank details → confirm → submit withdraw request", discipline: "Frontend" }
        ]
      },
      {
        name: "Chat & notifications",
        tasks: [
          { name: "Implement chat screen using WebSocket client (STOMP.js or similar) for real-time messages", discipline: "Frontend" },
          { name: "Implement chat message list with timestamps, read receipts, and image attachment support", discipline: "Frontend" },
          { name: "Set up Expo Notifications: request permission on first launch, register device token with backend", discipline: "Frontend" },
          { name: "Handle push notification tap — deep link to the relevant job or chat screen", discipline: "Frontend" }
        ]
      },
      {
        name: "Reviews & disputes",
        tasks: [
          { name: "Review submission screen: 5-star rating + text review, triggered after job confirmed complete", discipline: "Frontend" },
          { name: "Dispute screen: describe issue, upload evidence files, submit dispute", discipline: "Frontend" },
          { name: "Dispute status tracker: show current dispute stage and expected resolution timeline", discipline: "Frontend" }
        ]
      },
      {
        name: "Profile & settings",
        tasks: [
          { name: "My profile screen: view and edit bio, photo, services listed (for providers)", discipline: "Frontend" },
          { name: "Settings screen: notification preferences, account security, logout", discipline: "Frontend" },
          { name: "Admin panel screen (role-gated): list pending verifications, list open disputes, resolve buttons", discipline: "Frontend" }
        ]
      }
    ]
  },
  {
    phase: 6,
    phaseName: "Phase 6: Integration & Full Testing",
    phaseDesc: "Connect mobile frontend to live backend and verify user journeys, edge cases, security, and performance.",
    subcategories: [
      {
        name: "Integration testing",
        tasks: [
          { name: "Connect React Native app to the dev backend — update API base URL to your dev server IP", discipline: "DevOps" },
          { name: "Walk through the complete requester journey: register → post request → receive offer → pay escrow → confirm completion → release funds", discipline: "Frontend" },
          { name: "Walk through the complete provider journey: register → browse requests → submit offer → upload proof → receive payout", discipline: "Backend" },
          { name: "Test the payment flow end-to-end using Paystack test cards and MoMo test numbers", discipline: "Business" },
          { name: "Test real-time chat: open two devices, confirm message delivery and WebSocket reconnection", discipline: "Frontend" },
          { name: "Test push notifications: trigger each event type and verify the notification arrives and deep-links correctly", discipline: "Frontend" }
        ]
      },
      {
        name: "Edge cases & error handling",
        tasks: [
          { name: "Test payment failure: Paystack charge fails → job should not be created, user should see clear error", discipline: "Backend" },
          { name: "Test provider no-show: requester raises dispute, admin resolves with full refund", discipline: "Backend" },
          { name: "Test token expiry: access token expires mid-session → silent refresh → request retried", discipline: "Frontend" },
          { name: "Test offline mode: app loses internet → show appropriate empty states, no crashes", discipline: "Frontend" },
          { name: "Test file upload limits: upload an oversized image for portfolio/proof and confirm rejection with helpful message", discipline: "Frontend" },
          { name: "Test concurrent offers: multiple providers submit offers on the same request, requester accepts one, others are auto-declined", discipline: "Backend" }
        ]
      },
      {
        name: "Performance & security",
        tasks: [
          { name: "Add pagination to all list endpoints (requests, providers, jobs, transactions) — test with large data sets", discipline: "Backend" },
          { name: "Enable HTTPS on all backend endpoints (via Nginx reverse proxy or cloud provider)", discipline: "DevOps" },
          { name: "Confirm all sensitive fields (passwordHash, studentIdPhotoUrl) are never returned in API responses", discipline: "Backend" },
          { name: "Rate-limit the auth endpoints (e.g. max 5 login attempts per minute per IP) using Spring Cloud Gateway", discipline: "Backend" },
          { name: "Confirm S3 bucket is private — all file access must go through signed URLs from your backend", discipline: "DevOps" }
        ]
      }
    ]
  },
  {
    phase: 7,
    phaseName: "Phase 7: Backend Deployment & App Launch",
    phaseDesc: "Deploy services, build production applications, publish to Google Play Store, and host a KNUST student beta.",
    subcategories: [
      {
        name: "Backend deployment",
        tasks: [
          { name: "Deploy all Spring Boot microservices using Docker Compose on a VPS (Render, Railway, or DigitalOcean)", discipline: "DevOps" },
          { name: "Set up Nginx as a reverse proxy routing subdomains to individual services (e.g. api.campusserv.com)", discipline: "DevOps" },
          { name: "Configure production environment variables (DB URL, Paystack live keys, JWT secret, S3 credentials)", discipline: "DevOps" },
          { name: "Set up basic monitoring: health check endpoints, Uptime Robot or Better Stack for uptime alerts", discipline: "DevOps" },
          { name: "Enable PostgreSQL automated backups on the cloud provider", discipline: "DevOps" }
        ]
      },
      {
        name: "App publishing",
        tasks: [
          { name: "Configure Expo EAS Build for Android APK and iOS IPA builds", discipline: "Frontend" },
          { name: "Publish the app to Expo Go for internal testing (TestFlight / APK sideload)", discipline: "Frontend" },
          { name: "Submit to Google Play Store (Internal Testing track first)", discipline: "Frontend" },
          { name: "Prepare app store assets: icon, screenshots, short description, privacy policy URL", discipline: "Business" }
        ]
      },
      {
        name: "Beta launch",
        tasks: [
          { name: "Recruit 20–30 KNUST students (mix of requesters and providers) for a closed beta", discipline: "Business" },
          { name: "Set up a feedback form (Google Form or Typeform) and share with all beta users", discipline: "Business" },
          { name: "Monitor error logs and fix critical bugs within 24 hours during the beta window", discipline: "DevOps" },
          { name: "Collect at least 10 completed real transactions before going to full campus launch", discipline: "Business" },
          { name: "Review and respond to all beta feedback, prioritise fixes vs nice-to-haves", discipline: "Business" }
        ]
      }
    ]
  }
];

// --- Team Configuration ---
const TEAM_MEMBERS = [
  { name: "Allen", role: "Backend Lead", initial: "A", class: "avatar-allen" },
  { name: "Kwame", role: "Frontend Lead", initial: "K", class: "avatar-kwame" },
  { name: "Abena", role: "Database Lead", initial: "AB", class: "avatar-abena" },
  { name: "Kofi", role: "DevOps Lead", initial: "KO", class: "avatar-kofi" },
  { name: "Ama", role: "UI/UX Designer", initial: "AM", class: "avatar-ama" },
  { name: "Yao", role: "Business Analyst", initial: "Y", class: "avatar-yao" }
];

// --- App State ---
let state = {
  tasks: [],
  filters: {
    discipline: "all",
    status: "all",
    search: ""
  },
  currentlyEditingTaskId: null
};

// --- DOM Cache ---
const elements = {
  search: document.getElementById("search-input"),
  disciplineFilters: document.querySelectorAll(".filter-btn"),
  statusFilters: document.querySelectorAll(".status-filter-btn"),
  overallProgressPercentage: document.getElementById("overall-progress-percentage"),
  overallProgressFraction: document.getElementById("overall-progress-fraction"),
  overallProgressCircle: document.getElementById("overall-progress-circle"),
  phaseAccordionContainer: document.getElementById("phases-accordion-container"),
  teamRosterList: document.getElementById("team-roster-list"),
  phaseTimelineWidget: document.getElementById("phase-timeline-widget"),
  
  // Drawer
  drawer: document.getElementById("task-drawer"),
  drawerOverlay: document.getElementById("drawer-overlay"),
  closeDrawerBtn: document.getElementById("close-drawer-btn"),
  drawerTaskTitle: document.getElementById("drawer-task-title"),
  drawerTaskPhase: document.getElementById("drawer-task-phase"),
  drawerDisciplineBadge: document.getElementById("drawer-discipline-badge"),
  drawerStatusSelect: document.getElementById("drawer-status-select"),
  drawerAssigneeSelect: document.getElementById("drawer-assignee-select"),
  drawerDueDate: document.getElementById("drawer-due-date"),
  drawerNotes: document.getElementById("drawer-notes"),
  saveDrawerBtn: document.getElementById("save-drawer-btn"),

  // Reset Modal
  confirmModal: document.getElementById("confirm-modal"),
  confirmOverlay: document.getElementById("confirm-overlay"),
  confirmCancel: document.getElementById("confirm-cancel"),
  confirmOk: document.getElementById("confirm-ok"),
  resetBtn: document.getElementById("reset-btn"),

  // Export / Import
  exportBtn: document.getElementById("export-btn"),
  importBtnTrigger: document.getElementById("import-btn-trigger"),
  importFileInput: document.getElementById("import-file-input"),
  canvas: document.getElementById("confetti-canvas")
};

// --- Initialization ---
function init() {
  const savedTasks = localStorage.getItem("campusserv_roadmap_tasks");
  if (savedTasks) {
    try {
      state.tasks = JSON.parse(savedTasks);
      if (!Array.isArray(state.tasks) || state.tasks.length === 0) {
        generateDefaultTasks();
      }
    } catch (e) {
      generateDefaultTasks();
    }
  } else {
    generateDefaultTasks();
  }

  setupEventListeners();
  render();
  initConfettiCanvas();
}

function generateDefaultTasks() {
  state.tasks = [];
  let taskIdCounter = 1;
  ROADMAP_DATA.forEach(p => {
    p.subcategories.forEach(sub => {
      sub.tasks.forEach(t => {
        state.tasks.push({
          id: `task-${taskIdCounter++}`,
          phase: p.phase,
          phaseName: p.phaseName,
          subcategory: sub.name,
          name: t.name,
          discipline: t.discipline,
          completed: false,
          assignee: "",
          notes: "",
          dueDate: ""
        });
      });
    });
  });
  saveState();
}

function saveState() {
  localStorage.setItem("campusserv_roadmap_tasks", JSON.stringify(state.tasks));
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Search
  elements.search.addEventListener("input", (e) => {
    state.filters.search = e.target.value.toLowerCase();
    renderRoadmap();
  });

  // Discipline Filters
  elements.disciplineFilters.forEach(btn => {
    btn.addEventListener("click", () => {
      elements.disciplineFilters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.filters.discipline = btn.getAttribute("data-discipline");
      renderRoadmap();
    });
  });

  // Status Filters
  elements.statusFilters.forEach(btn => {
    btn.addEventListener("click", () => {
      elements.statusFilters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.filters.status = btn.getAttribute("data-status");
      renderRoadmap();
    });
  });

  // Drawer events
  elements.closeDrawerBtn.addEventListener("click", closeDrawer);
  elements.drawerOverlay.addEventListener("click", closeDrawer);
  elements.saveDrawerBtn.addEventListener("click", saveDrawerChanges);

  // Reset modal events
  elements.resetBtn.addEventListener("click", () => {
    elements.confirmModal.classList.add("active");
    elements.confirmOverlay.classList.add("active");
  });

  elements.confirmCancel.addEventListener("click", () => {
    elements.confirmModal.classList.remove("active");
    elements.confirmOverlay.classList.remove("active");
  });

  elements.confirmOk.addEventListener("click", () => {
    generateDefaultTasks();
    elements.confirmModal.classList.remove("active");
    elements.confirmOverlay.classList.remove("active");
    render();
  });

  // Export Progress
  elements.exportBtn.addEventListener("click", exportProgress);

  // Import Progress
  elements.importBtnTrigger.addEventListener("click", () => {
    elements.importFileInput.click();
  });
  elements.importFileInput.addEventListener("change", importProgress);

  // Keyboard Shortcuts (Alt+E, Alt+R, Esc, /)
  document.addEventListener("keydown", (e) => {
    // Esc: close active overlays
    if (e.key === "Escape") {
      closeDrawer();
      elements.confirmModal.classList.remove("active");
      elements.confirmOverlay.classList.remove("active");
      closeInlineAssigneeMenu();
    }
    // '/' or 's' (if not currently focused inside input fields)
    if ((e.key === "/" || e.key.toLowerCase() === "s") && 
        document.activeElement !== elements.search && 
        document.activeElement.tagName !== "INPUT" && 
        document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      elements.search.focus();
      elements.search.select();
    }
    // Alt+E: Export
    if (e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault();
      exportProgress();
    }
    // Alt+R: Reset
    if (e.altKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      elements.resetBtn.click();
    }
  });

  // Dismiss inline selector dropdown on general clicks
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".inline-assignee-menu") && !e.target.closest(".assignee-bubble") && !e.target.closest(".assignee-empty-trigger")) {
      closeInlineAssigneeMenu();
    }
  });
}

// --- Close Inline Assignee Selector Menu ---
function closeInlineAssigneeMenu() {
  const existingMenu = document.getElementById("inline-assignee-menu");
  if (existingMenu) {
    existingMenu.remove();
  }
}

// --- Rendering Engine ---
function render() {
  renderMetrics();
  renderRoadmap();
  renderSidebar();
}

function renderMetrics() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Overall Ring
  elements.overallProgressPercentage.textContent = `${percentage}%`;
  elements.overallProgressFraction.textContent = `${completed} / ${total} tasks`;

  const offset = 314.15 - (314.15 * percentage) / 100;
  elements.overallProgressCircle.style.strokeDashoffset = offset;

  // Category progress meters
  const disciplines = ["Backend", "Frontend", "Database", "DevOps", "Design", "Business"];
  disciplines.forEach(disc => {
    const discTasks = state.tasks.filter(t => t.discipline === disc);
    const completedDisc = discTasks.filter(t => t.completed).length;
    const totalDisc = discTasks.length;
    const p = totalDisc > 0 ? Math.round((completedDisc / totalDisc) * 100) : 0;

    const statEl = document.getElementById(`stat-${disc.toLowerCase()}`);
    const barEl = document.getElementById(`bar-${disc.toLowerCase()}`);

    if (statEl) statEl.textContent = `${completedDisc} / ${totalDisc} (${p}%)\u00A0\u00A0`;
    if (barEl) barEl.style.width = `${p}%`;
  });
}

function renderRoadmap() {
  elements.phaseAccordionContainer.innerHTML = "";

  ROADMAP_DATA.forEach(pData => {
    const phaseTasks = state.tasks.filter(t => t.phase === pData.phase);
    
    // Filter tasks based on search & filters
    const filteredTasks = phaseTasks.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(state.filters.search) || 
                          t.subcategory.toLowerCase().includes(state.filters.search);
      const matchDiscipline = state.filters.discipline === "all" || t.discipline === state.filters.discipline;
      const matchStatus = state.filters.status === "all" ||
                          (state.filters.status === "completed" && t.completed) ||
                          (state.filters.status === "pending" && !t.completed);
      return matchSearch && matchDiscipline && matchStatus;
    });

    if (filteredTasks.length === 0 && (state.filters.search !== "" || state.filters.discipline !== "all" || state.filters.status !== "all")) {
      return; 
    }

    const phaseTotal = phaseTasks.length;
    const phaseCompleted = phaseTasks.filter(t => t.completed).length;
    const phasePercent = phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;

    const phasePanel = document.createElement("div");
    phasePanel.className = "phase-panel glass-panel expanded"; 
    phasePanel.setAttribute("data-phase", pData.phase);

    phasePanel.innerHTML = `
      <div class="phase-header" onclick="togglePhasePanel(this)">
        <div class="phase-header-left">
          <div class="phase-number-badge">${pData.phase}</div>
          <div class="phase-title-text">
            <h3>${pData.phaseName}</h3>
            <p>${pData.phaseDesc}</p>
          </div>
        </div>
        <div class="phase-header-right">
          <div class="phase-progress-capsule">
            <span class="phase-percentage">${phasePercent}%</span>
            <div class="phase-mini-progress">
              <div class="phase-mini-fill" style="width: ${phasePercent}%"></div>
            </div>
          </div>
          <i class="fas fa-chevron-down phase-toggle-icon"></i>
        </div>
      </div>
      <div class="phase-content">
        <!-- Subsections injected here -->
      </div>
    `;

    const contentDiv = phasePanel.querySelector(".phase-content");
    const subcats = [...new Set(filteredTasks.map(t => t.subcategory))];

    subcats.forEach(subName => {
      const subTasks = filteredTasks.filter(t => t.subcategory === subName);
      const subCompletedCount = subTasks.filter(t => t.completed).length;
      const isSubAllDone = subCompletedCount === subTasks.length;

      const subsection = document.createElement("div");
      subsection.className = "task-subsection";
      subsection.innerHTML = `
        <div class="subsection-header">
          <span>${subName}</span>
          <div class="subsection-header-actions">
            <span class="subsection-count">${subCompletedCount} / ${subTasks.length} Done</span>
            <button class="batch-btn" onclick="toggleSubcategory('${pData.phase}', '${subName}', event)" title="Toggle all in this subcategory (Efficiency Batch Trigger)">
              <i class="${isSubAllDone ? 'fas fa-undo' : 'fas fa-check-double'}"></i>
            </button>
          </div>
        </div>
        <div class="tasks-list"></div>
      `;

      const listDiv = subsection.querySelector(".tasks-list");

      subTasks.forEach(task => {
        const taskItem = document.createElement("div");
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.setAttribute("data-id", task.id);
        taskItem.setAttribute("data-discipline", task.discipline);

        // Click task card to open drawer (excluding checkbox & assignee click)
        taskItem.addEventListener("click", (e) => {
          if (!e.target.closest(".checkbox-container") && 
              !e.target.closest(".assignee-bubble") && 
              !e.target.closest(".assignee-empty-trigger")) {
            openTaskDrawer(task.id);
          }
        });

        // Resolve initials and bubble for assignee
        let assigneeMarkup = "";
        if (task.assignee) {
          const member = TEAM_MEMBERS.find(m => m.name === task.assignee);
          const initials = member ? member.initial : task.assignee.substring(0, 2).toUpperCase();
          const avatarClass = member ? member.class : "avatar-yao";
          assigneeMarkup = `<div class="assignee-bubble ${avatarClass}" title="Assigned to ${task.assignee}. Click to quick-reassign." onclick="handleQuickAssignClick('${task.id}', event)">${initials}</div>`;
        } else {
          assigneeMarkup = `<div class="assignee-empty-trigger" title="Unassigned. Click to quick-assign." onclick="handleQuickAssignClick('${task.id}', event)"><i class="fas fa-plus"></i></div>`;
        }

        const hasNotes = task.notes && task.notes.trim() !== "";
        const noteIcon = hasNotes ? `<i class="fas fa-comment-alt note-indicator-icon" title="Has notes/logs"></i>` : "";
        const dueDateText = task.dueDate ? `<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px dashed rgba(255,255,255,0.1); margin-right:0.25rem;"><i class="far fa-calendar"></i> ${formatShortDate(task.dueDate)}</span>` : "";

        taskItem.innerHTML = `
          <div class="task-item-left">
            <label class="checkbox-container">
              <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', event)">
              <span class="checkmark"></span>
            </label>
            <span class="task-title-label">${task.name}</span>
          </div>
          <div class="task-item-right">
            ${dueDateText}
            ${noteIcon}
            <span class="badge badge-${task.discipline.toLowerCase()}">${task.discipline}</span>
            ${assigneeMarkup}
          </div>
        `;

        listDiv.appendChild(taskItem);
      });

      contentDiv.appendChild(subsection);
    });

    elements.phaseAccordionContainer.appendChild(phasePanel);
  });

  if (elements.phaseAccordionContainer.children.length === 0) {
    elements.phaseAccordionContainer.innerHTML = `
      <div class="glass-panel" style="padding: 3rem; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-search" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-tertiary);"></i>
        <h3>No tasks found matching your filters</h3>
        <p style="margin-top: 0.5rem; font-size: 0.9rem;">Try adjusting your keyword search or discipline toggles.</p>
      </div>
    `;
  }
}

function renderSidebar() {
  // 1. Render Team Roster with performance stats
  elements.teamRosterList.innerHTML = "";
  TEAM_MEMBERS.forEach(m => {
    const assignedTasks = state.tasks.filter(t => t.assignee === m.name);
    const completedTasks = assignedTasks.filter(t => t.completed).length;
    const totalCount = assignedTasks.length;
    const p = totalCount > 0 ? Math.round((completedTasks / totalCount) * 100) : 0;

    const card = document.createElement("div");
    card.className = "team-member-card";
    card.innerHTML = `
      <div class="team-member-left">
        <div class="avatar-large ${m.class}">${m.initial}</div>
        <div class="member-info">
          <h5>${m.name}</h5>
          <p>${m.role}</p>
        </div>
      </div>
      <div class="member-progress-metrics">
        <span class="member-percent">${p}%</span>
        <span class="member-count-fraction">${completedTasks} / ${totalCount} tasks</span>
      </div>
    `;
    elements.teamRosterList.appendChild(card);
  });

  // 2. Render Phase Timeline Widget
  elements.phaseTimelineWidget.innerHTML = "";
  ROADMAP_DATA.forEach(p => {
    const pTasks = state.tasks.filter(t => t.phase === p.phase);
    const completed = pTasks.filter(t => t.completed).length;
    const total = pTasks.length;
    const isCompleted = completed === total && total > 0;
    const isActive = completed > 0 && completed < total;

    const timelineItem = document.createElement("div");
    timelineItem.className = `phase-timeline-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`;
    
    let statusIcon = `<i class="far fa-circle" style="color: var(--text-tertiary);"></i>`;
    if (isCompleted) statusIcon = `<i class="fas fa-check-circle" style="color: var(--color-database);"></i>`;
    else if (isActive) statusIcon = `<i class="fas fa-spinner fa-spin" style="color: var(--color-backend);"></i>`;

    timelineItem.innerHTML = `
      <span class="phase-timeline-name">${statusIcon} Phase ${p.phase}</span>
      <span class="phase-timeline-badge">${completed}/${total}</span>
    `;
    elements.phaseTimelineWidget.appendChild(timelineItem);
  });
}

// --- Toggle Phase Panel ---
window.togglePhasePanel = function(headerEl) {
  const panel = headerEl.closest(".phase-panel");
  panel.classList.toggle("expanded");
};

// --- Task Completion Toggle ---
window.toggleTask = function(taskId, event) {
  const isChecked = event.target.checked;
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = isChecked;
    saveState();
    renderMetrics();
    renderSidebar();

    const itemCard = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (itemCard) {
      if (isChecked) {
        itemCard.classList.add("completed");
        
        // Check if the whole phase is now completed!
        const phaseTasks = state.tasks.filter(t => t.phase === task.phase);
        const completedPhaseCount = phaseTasks.filter(t => t.completed).length;
        
        if (completedPhaseCount === phaseTasks.length) {
          triggerCelebration(`Phase ${task.phase} Completed! 🎉`);
        } else {
          triggerConfettiAt(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2, 25);
        }
      } else {
        itemCard.classList.remove("completed");
      }
    }
  }
};

// --- Subcategory Batch Toggle ---
window.toggleSubcategory = function(phaseNum, subcatName, event) {
  event.stopPropagation();
  const phaseVal = parseInt(phaseNum);
  const subTasks = state.tasks.filter(t => t.phase === phaseVal && t.subcategory === subcatName);
  
  // If all are completed, mark all as incomplete. Otherwise, mark all as completed.
  const allCompleted = subTasks.every(t => t.completed);
  subTasks.forEach(t => t.completed = !allCompleted);
  
  saveState();
  render();

  if (!allCompleted) {
    triggerConfettiAt(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2, 35);
  }
};

// --- Inline Assignee Quick Selector Popover ---
window.handleQuickAssignClick = function(taskId, event) {
  event.stopPropagation();
  closeInlineAssigneeMenu();

  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const rect = event.target.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.id = "inline-assignee-menu";
  menu.className = "inline-assignee-menu";
  
  // Position menu
  menu.style.top = `${window.scrollY + rect.bottom + 6}px`;
  menu.style.left = `${window.scrollX + rect.left - 198 + rect.width}px`;

  // Populate menu with options
  TEAM_MEMBERS.forEach(member => {
    const isCurrent = task.assignee === member.name;
    const option = document.createElement("div");
    option.className = "inline-assignee-option";
    option.innerHTML = `
      <div class="avatar-large ${member.class}" style="width:18px; height:18px; font-size:0.55rem;">${member.initial}</div>
      <span style="flex:1;">${member.name} (${member.role.split(' ')[0]})</span>
      ${isCurrent ? '<i class="fas fa-check" style="color: var(--color-database); font-size:0.75rem;"></i>' : ''}
    `;
    option.addEventListener("click", () => {
      task.assignee = member.name;
      saveState();
      render();
      closeInlineAssigneeMenu();
    });
    menu.appendChild(option);
  });

  // Add "Unassigned" option
  if (task.assignee) {
    const unassignOption = document.createElement("div");
    unassignOption.className = "inline-assignee-option unassigned";
    unassignOption.innerHTML = `
      <i class="fas fa-user-slash" style="font-size:0.8rem; width:18px; text-align:center;"></i>
      <span>Unassign Task</span>
    `;
    unassignOption.addEventListener("click", () => {
      task.assignee = "";
      saveState();
      render();
      closeInlineAssigneeMenu();
    });
    menu.appendChild(unassignOption);
  }

  document.body.appendChild(menu);
};

// --- Detail Drawer Functions ---
function openTaskDrawer(taskId) {
  state.currentlyEditingTaskId = taskId;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  elements.drawerTaskTitle.textContent = task.name;
  elements.drawerTaskPhase.textContent = `${task.phaseName} > ${task.subcategory}`;
  
  elements.drawerDisciplineBadge.className = `badge badge-${task.discipline.toLowerCase()}`;
  elements.drawerDisciplineBadge.textContent = task.discipline;

  elements.drawerStatusSelect.value = task.completed ? "Completed" : (task.assignee ? "In Progress" : "Not Started");
  elements.drawerAssigneeSelect.value = task.assignee;
  elements.drawerDueDate.value = task.dueDate;
  elements.drawerNotes.value = task.notes;

  elements.drawer.classList.add("open");
  elements.drawerOverlay.classList.add("active");
}

function closeDrawer() {
  elements.drawer.classList.remove("open");
  elements.drawerOverlay.classList.remove("active");
  state.currentlyEditingTaskId = null;
}

function saveDrawerChanges() {
  const taskId = state.currentlyEditingTaskId;
  if (!taskId) return;

  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    const statusVal = elements.drawerStatusSelect.value;
    task.completed = (statusVal === "Completed");
    task.assignee = elements.drawerAssigneeSelect.value;
    task.dueDate = elements.drawerDueDate.value;
    task.notes = elements.drawerNotes.value;

    saveState();
    render();
    closeDrawer();
  }
}

// --- Import / Export ---
function exportProgress() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `campusserv-roadmap-progress-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importProgress(e) {
  const fileReader = new FileReader();
  const file = e.target.files[0];
  if (!file) return;

  fileReader.onload = function(event) {
    try {
      const parsedTasks = JSON.parse(event.target.result);
      if (Array.isArray(parsedTasks) && parsedTasks.length > 0 && parsedTasks[0].id) {
        state.tasks = parsedTasks;
        saveState();
        render();
        triggerCelebration("Progress Loaded Successfully! 🔄");
      } else {
        alert("Invalid roadmap JSON file. Check format.");
      }
    } catch (err) {
      alert("Error parsing JSON file: " + err.message);
    }
  };
  fileReader.readAsText(file);
}

// --- Helper Functions ---
function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

// --- High-Fidelity Confetti Celebration Engine ---
let confettiParticles = [];
let confettiCtx = null;
let animationFrameId = null;

function initConfettiCanvas() {
  confettiCtx = elements.canvas.getContext("2d");
  resizeConfettiCanvas();
  window.addEventListener("resize", resizeConfettiCanvas);
}

function resizeConfettiCanvas() {
  if (elements.canvas) {
    elements.canvas.width = window.innerWidth;
    elements.canvas.height = window.innerHeight;
  }
}

class ConfettiParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 4;
    this.color = color;
    this.speedX = Math.random() * 8 - 4;
    this.speedY = Math.random() * -12 - 5;
    this.gravity = 0.25;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 10 - 5;
    this.opacity = 1;
    this.decay = Math.random() * 0.015 + 0.01;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedY += this.gravity;
    this.rotation += this.rotationSpeed;
    this.opacity -= this.decay;
  }

  draw() {
    confettiCtx.save();
    confettiCtx.translate(this.x, this.y);
    confettiCtx.rotate((this.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = this.opacity;
    confettiCtx.fillStyle = this.color;
    confettiCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.5);
    confettiCtx.restore();
  }
}

function triggerConfettiAt(x, y, count) {
  const colors = [
    "hsl(260, 85%, 68%)", 
    "hsl(195, 90%, 60%)", 
    "hsl(160, 75%, 45%)", 
    "hsl(35, 95%, 55%)",  
    "hsl(330, 85%, 65%)", 
    "hsl(45, 95%, 50%)"   
  ];

  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    confettiParticles.push(new ConfettiParticle(x, y, color));
  }

  if (!animationFrameId) {
    animateConfetti();
  }
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

  confettiParticles.forEach((p, index) => {
    p.update();
    p.draw();
    if (p.opacity <= 0 || p.y > elements.canvas.height) {
      confettiParticles.splice(index, 1);
    }
  });

  if (confettiParticles.length > 0) {
    animationFrameId = requestAnimationFrame(animateConfetti);
  } else {
    animationFrameId = null;
    confettiCtx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  }
}

function triggerCelebration(messageText) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  triggerConfettiAt(w * 0.2, h * 0.8, 45);
  triggerConfettiAt(w * 0.5, h * 0.8, 55);
  triggerConfettiAt(w * 0.8, h * 0.8, 45);

  const banner = document.createElement("div");
  banner.className = "glass-panel";
  banner.style.position = "fixed";
  banner.style.top = "20%";
  banner.style.left = "50%";
  banner.style.transform = "translate(-50%, -50%) scale(0.8)";
  banner.style.padding = "1.5rem 3rem";
  banner.style.zIndex = "10000";
  banner.style.textAlign = "center";
  banner.style.boxShadow = "0 10px 40px rgba(139, 92, 246, 0.4)";
  banner.style.border = "1px solid var(--color-backend)";
  banner.style.opacity = "0";
  banner.style.transition = "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
  banner.style.pointerEvents = "none";

  banner.innerHTML = `
    <h2 style="background: var(--grad-main); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.8rem; font-weight: 800;">${messageText}</h2>
    <p style="color: var(--text-primary); margin-top: 0.5rem; font-size: 0.95rem;">Keep up the amazing momentum!</p>
  `;

  document.body.appendChild(banner);
  
  setTimeout(() => {
    banner.style.opacity = "1";
    banner.style.transform = "translate(-50%, -50%) scale(1)";
  }, 50);

  setTimeout(() => {
    banner.style.opacity = "0";
    banner.style.transform = "translate(-50%, -50%) scale(0.9)";
    setTimeout(() => banner.remove(), 500);
  }, 3000);
}

// Start Application on Page Load
window.addEventListener("DOMContentLoaded", init);
