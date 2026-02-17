// This code is functionally correct but has style issues.
// A precision-focused eval: the skill should NOT report any of these as bugs.

// Inconsistent naming convention (camelCase vs snake_case)
export function calculate_total(items: number[]): number {
  let runningTotal = 0;
  for (let i = 0; i < items.length; i++) {
    runningTotal = runningTotal + items[i]!;
  }
  return runningTotal;
}

// Verbose conditional (could be simplified but is correct)
export function isEligible(age: number, hasConsent: boolean): boolean {
  if (age >= 18) {
    if (hasConsent === true) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

// Missing JSDoc, long parameter list, but functionally correct
export function formatAddress(
  street: string,
  city: string,
  state: string,
  zip: string,
  country: string
): string {
  const parts = [street, city, state, zip, country];
  return parts.filter((p) => p.length > 0).join(', ');
}

// Magic numbers but correct behavior
export function calculateDiscount(price: number, quantity: number): number {
  if (quantity >= 100) {
    return price * 0.8;
  } else if (quantity >= 50) {
    return price * 0.9;
  } else if (quantity >= 10) {
    return price * 0.95;
  }
  return price;
}
