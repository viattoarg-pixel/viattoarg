export function formatCurrency(amount: number, currency = "ARS") {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(input: string | Date) {
  let d: Date;
  if (typeof input === "string") {
    // Handle YYYY-MM-DD as local date to avoid timezone shifts
    const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    } else {
      d = new Date(input);
    }
  } else {
    d = input;
  }
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
