import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import doctorModel from '../models/doctorModel.js';

export const refreshToken = async (req, res) => {
  try {
    const rfToken = req.cookies?.refreshToken;
    if (!rfToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    // Verify token
    const decoded = jwt.verify(rfToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token payload' });
    }

    const { id, role } = decoded;

    // Admin stateless verification
    if (role === 'admin' && id === 'admin') {
      const accessToken = jwt.sign({ id: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '15m' });
      res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });
      return res.json({ success: true, message: 'Token refreshed' });
    }

    let user = null;
    if (role === 'patient') {
      user = await userModel.findById(id);
    } else if (role === 'doctor') {
      user = await doctorModel.findById(id);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if refresh token is in DB
    if (!user.refreshTokens || !user.refreshTokens.includes(rfToken)) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or revoked' });
    }

    // Issue new access token
    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });

    return res.json({ success: true, message: 'Token refreshed' });

  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};
