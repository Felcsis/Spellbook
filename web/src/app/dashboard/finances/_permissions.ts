type FinanceViewer = {
  name?: string | null;
  email?: string | null;
};

export function canSeeFinanceProfit(user: FinanceViewer) {
  const name = (user.name ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const email = (user.email ?? "").toLowerCase();

  return name === "felicia" || email.startsWith("felicia@");
}
