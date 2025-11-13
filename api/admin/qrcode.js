import QRCode from 'qrcode';

/**
 * Serverless function to generate QR code
 * GET /api/admin/qrcode?url=<encoded_url>
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);

    // Generate QR code as data URL (PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(decodedUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Return as JSON with data URL
    return res.status(200).json({
      success: true,
      dataUrl: qrCodeDataUrl,
      url: decodedUrl
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({ 
      error: 'Failed to generate QR code',
      message: error.message 
    });
  }
}

