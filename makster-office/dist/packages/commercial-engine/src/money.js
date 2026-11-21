export function assertMinor(value, name = 'money') {
    if (!Number.isSafeInteger(value))
        throw new Error(`${name}_must_be_safe_integer_minor_units`);
    return value;
}
export function bpsAmount(base, bps) {
    if (!Number.isInteger(bps))
        throw new Error('bps_must_be_integer');
    return Math.round(base * bps / 10_000);
}
export function roundToIncrement(value, increment) {
    if (!increment || increment <= 1)
        return value;
    if (!Number.isSafeInteger(increment))
        throw new Error('rounding_increment_must_be_integer');
    return Math.round(value / increment) * increment;
}
export function decimalToMinor(value, decimals = 2) {
    if (!Number.isFinite(value))
        throw new Error('decimal_money_invalid');
    return Math.round(value * Math.pow(10, decimals));
}
export function formatMoney(minor, currency, locale = 'en-GB') {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100);
}
