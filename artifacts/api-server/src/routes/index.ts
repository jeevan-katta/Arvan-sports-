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

export default router;
