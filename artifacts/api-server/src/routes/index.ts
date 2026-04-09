import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import invoicesRouter from "./invoices";
import suppliersRouter from "./suppliers";
import purchaseOrdersRouter from "./purchase-orders";
import speedchartsRouter from "./speedcharts";
import fiscalImportRouter from "./fiscal-import";
import staffRouter from "./staff";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import vendorRouter from "./vendor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(invoicesRouter);
router.use(suppliersRouter);
router.use(purchaseOrdersRouter);
router.use(speedchartsRouter);
router.use(fiscalImportRouter);
router.use(staffRouter);
router.use(dashboardRouter);
router.use(storageRouter);
router.use(vendorRouter);

export default router;
