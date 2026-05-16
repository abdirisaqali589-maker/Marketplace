import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { AuthPayload } from './middleware';

export function generateTokens(payload: AuthPayload) {
  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });

  const refreshToken = uuidv4();

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtSecret) as AuthPayload;
}