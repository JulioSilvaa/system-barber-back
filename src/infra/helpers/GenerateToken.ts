import jwt from "jsonwebtoken";

export function generateAccessToken(id: string) {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }
  return jwt.sign({ userId: id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "30m", // Access token com 30 minutos (tempo suficiente para criar espaço após registro)
    subject: id,
  });
}

export function generateRefreshToken(sub: string) {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not defined");
  }
  return jwt.sign({ userId: sub }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d", // Refresh token com vida longa
    subject: sub,
  });
}
