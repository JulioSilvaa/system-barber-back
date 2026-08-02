import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface IPayload {
  sub: string;
}

class AuthMiddleware {
  auth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Token não fornecido" });
    }

    // Espera o formato "Bearer <TOKEN>"
    const [, token] = authHeader.split(" ");

    if (!token) {
      return res.status(401).json({ message: "Formato do token inválido" });
    }

    if (!process.env.JWT_ACCESS_SECRET) {
      return res.status(500).json({ message: "Erro de configuração do servidor" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as IPayload;

      // Injeta o ID do usuário no Request
      req.user_id = decoded.sub;

      return next();
    } catch (error) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }
  }
}

export default new AuthMiddleware();