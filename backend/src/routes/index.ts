import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import turfsRouter from "./turfs";
import bookingsRouter from "./bookings";
import communityRouter from "./community";
import eventsRouter from "./events";
import shopRouter from "./shop";
import adminRouter from "./admin";
import ownerRouter from "./owner";
import liveScoresRouter from "./live-scores";
import uploadRouter from "./upload";
import announcementsRouter from "./announcements";
import pushRouter from "./push";

const router = Router();

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
