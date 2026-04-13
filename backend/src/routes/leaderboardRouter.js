import express from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_leaderboard');
    
    if (error) {
      console.error('Leaderboard RPC Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    return res.json(data || []);
  } catch (e) {
    console.error('Leaderboard Catch Error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
