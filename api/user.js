import listBusinesses from '../lib/routes/user/businesses.js';

export default async function handler(req, res) {
  const path = (req.url || '').toLowerCase();
  try {
    if (path.includes('/businesses')) return listBusinesses(req, res);
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('user router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


