export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: Date.now(),
    message: 'Health check working'
  });
}
