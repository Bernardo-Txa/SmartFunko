export const ORDER_INSTALLMENT_THRESHOLD_CENTS = 15000;
export const ADMIN_MAX_INSTALLMENTS_LIMIT = 12;
export const RAFFLE_MAX_INSTALLMENTS = 1;

export type PaymentFeeMode = "merchant_absorbs" | "customer_pays" | "account_default";
export type PaymentMaxInstallmentsSource = "default_rule" | "admin_override";

export function getDefaultOrderMaxInstallments(amountInCents: number): number {
  return amountInCents >= ORDER_INSTALLMENT_THRESHOLD_CENTS ? 3 : 1;
}

export function validateAdminMaxInstallments(value: number): number {
  if (!Number.isInteger(value)) {
    throw new Error("Parcelas maximas devem ser um numero inteiro");
  }

  if (value < 1 || value > ADMIN_MAX_INSTALLMENTS_LIMIT) {
    throw new Error(`Parcelas maximas devem estar entre 1 e ${ADMIN_MAX_INSTALLMENTS_LIMIT}`);
  }

  return value;
}

export function getRafflePaymentRules() {
  return {
    feeMode: "customer_pays" as PaymentFeeMode,
    maxInstallments: RAFFLE_MAX_INSTALLMENTS,
    maxInstallmentsSource: "default_rule" as PaymentMaxInstallmentsSource,
  };
}
