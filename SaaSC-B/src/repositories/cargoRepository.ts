import { pool } from '../db/index.js';

export async function getOutstandingBalance(deptoId: string): Promise<number> {
    const query = `
        SELECT COALESCE(SUM(monto), 0) as total_pendiente
        FROM cargos
        WHERE depto_id = $1 AND estado = 'PENDIENTE'
    `;
    const result = await pool.query(query, [deptoId]);
    return parseFloat(result.rows[0].total_pendiente);
}

export async function markCargoAsPaid(deptoId: string, cargoId?: string | null) {
    if (cargoId) {
        const query = `
            UPDATE cargos
            SET estado = 'PAGADO'
            WHERE id = $1;
        `;
        return await pool.query(query, [cargoId]);
    } else {
        const query = `
            UPDATE cargos
            SET estado = 'PAGADO'
            WHERE id = (
                SELECT id FROM cargos
                WHERE depto_id = $1 AND estado = 'PENDIENTE'
                ORDER BY creado_en ASC
                LIMIT 1
            );
        `;
        return await pool.query(query, [deptoId]);
    }
}