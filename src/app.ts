import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import "./config/passport";

// routes
import authRoute from "./routes/auth";
import contractsRoute from "./routes/contracts";
import paymentsRoute from "./routes/payments";
import { handleWebhook } from "./controllers/payment.controller";

const app = express();

// Trust the proxy to ensure proper handling of secure cookies
app.set("trust proxy", 1);

app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https") {
    console.log("Hello");
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

app.use(
  cors({
    origin: "https://contractify-inky.vercel.app", // Must match exactly your client URL, e.g., "https://contractify-inky.vercel.app"
    credentials: true,
  })
);

app.use(helmet());
app.use(morgan("dev"));

app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI! }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // true in production (HTTPS)
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoute);
app.use("/contracts", contractsRoute);
app.use("/payments", paymentsRoute);

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
