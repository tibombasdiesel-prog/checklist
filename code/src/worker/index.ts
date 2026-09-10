import { Hono } from "hono";
import auth from "./auth";
import checklists from "./checklists";
import users from "./users";
import notifications from "./notifications";
import fleetChecklists from "./fleet-checklists";
import vehicles from "./vehicles";

const app = new Hono<{ Bindings: Env }>();

// Mount auth routes
app.route("/", auth);

// Mount checklist routes
app.route("/", checklists);

// Mount user management routes
app.route("/", users);

// Mount notification routes
app.route("/", notifications);

// Mount fleet checklist routes
app.route("/", fleetChecklists);

// Mount vehicle routes
app.route("/api/vehicles", vehicles);

export default app;
