export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Erro desconhecido';
}

export function getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) return error.stack;
    return undefined;
}

export function logError(context: string, error: unknown, metadata?: Record<string, any>) {
    console.error(`[${context}] Error:`, {
        message: getErrorMessage(error),
        stack: getErrorStack(error),
        metadata,
        timestamp: new Date().toISOString()
    });
}