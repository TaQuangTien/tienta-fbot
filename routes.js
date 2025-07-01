import express from 'express';
import dotenv from 'dotenv';
const router = express.Router();

import routesUI from './routes-ui.js';
import routesAPI from './routes-api.js';


router.use('/api', routesAPI);
router.use('/', routesUI);

export default router;