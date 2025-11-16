import maps from '../lib/routes/admin/maps.js';
import generate from '../lib/routes/admin/generate.js';
import qrcode from '../lib/routes/admin/qrcode.js';

export default async function handler(req, res) {
  const path = (req.url || '').toLowerCase();
  try {
    if (path.includes('/maps')) return maps(req, res);
    if (path.includes('/generate')) return generate(req, res);
    if (path.includes('/qrcode')) return qrcode(req, res);
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('admin router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


