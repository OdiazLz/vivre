import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    console.error('❌ Error:', err);

    const errorCode = (err as Error & { code?: string }).code;
    if (errorCode === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'El archivo supera el límite permitido de 8 MB.' });
        return;
    }
    if (err.message === 'Origen no permitido por CORS.') {
        res.status(403).json({ error: 'Origen no permitido.' });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
        return;
    }

    res.status(500).json({
        error: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: `Ruta no encontrada: ${req.method} ${req.url}`
    });
}
