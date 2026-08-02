import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 1000, // Limite de 1000 requisições por IP
  message: "Muitas requisições vindas deste IP, tente novamente após 15 minutos",
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para login (mais restrito)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 tentativas por 15 min
  message: "Muitas tentativas de login, tente novamente após 15 minutos",
});

// Limiter para registro
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  limit: 5, // 5 registros por hora por IP
  message: "Muitas contas criadas a partir deste IP, tente novamente após 1 hora",
});

// Limiter para forgot password
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: "Muitas solicitações de recuperação de senha, tente novamente após 1 hora",
});

// Limiter para reset password
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Muitas tentativas de redefinição de senha, tente novamente após 1 hora",
});

// Limiter para refresh token
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: "Muitas solicitações de atualização de token",
});
