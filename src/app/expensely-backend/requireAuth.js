const admin = require('./firebaseAdmin');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const idToken = authHeader.replace('Bearer ', '').trim();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = { email: decodedToken.email, uid: decodedToken.uid };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
};
