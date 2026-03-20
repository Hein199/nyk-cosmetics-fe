export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const ROLES = {
    ADMIN: 'admin',
    SALESPERSON: 'salesperson',
    REGIONAL_SALES: 'regional_sales',
} as const;

export const INVENTORY_UNITS = {
    PIECES: 'Pcs',
    DOZEN: 'D',
    PACKAGE: 'PK',
    BOX: 'P',
} as const;

// DB-safe numeric limits used by frontend form caps.
// Decimal(12,2) allows up to 9,999,999,999.99.
export const MAX_DECIMAL_12_2_INTEGER = 9_999_999_999;
// PostgreSQL int4 upper bound.
export const MAX_INT_32 = 2_147_483_647;