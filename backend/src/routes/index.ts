import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import turfsRouter from "./turfs.js";
import bookingsRouter from "./bookings.js";
import communityRouter from "./community.js";
import eventsRouter from "./events.js";
import shopRouter from "./shop.js";
import adminRouter from "./admin.js";
import ownerRouter from "./owner.js";
import liveScoresRouter from "./live-scores.js";
import uploadRouter from "./upload.js";
import announcementsRouter from "./announcements.js";
import pushRouter from "./push.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(turfsRouter);
router.use(bookingsRouter);
router.use(communityRouter);
router.use(eventsRouter);
router.use(shopRouter);
router.use(adminRouter);
router.use(ownerRouter);
router.use(liveScoresRouter);
router.use(uploadRouter);
router.use(announcementsRouter);
router.use(pushRouter);

export default router;
