export default function handler(req, res) {
  try {
    console.log('Test endpoint called');
    res.status(200).json({ 
      ok: true, 
      message: 'Simple test working',
      method: req.method,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in test:', error);
    res.status(500).json({ error: error.message });
  }
}
