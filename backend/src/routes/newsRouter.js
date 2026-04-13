import express from 'express';
import {newsController} from '../controllers/newsController.js'
console.log("News Router running!")
const router = express.Router();
router.get('/',newsController);
export default router;