// Predefined Spanish business expense categories with grouped subcategories.
// The selected value (string) is the subcategory label that gets persisted
// as the expense's `category` (via find-or-create on expense_categories).

export type CategoryGroup = {
  label: string;
  icon: string; // emoji
  color: string; // hsl()
  items: string[];
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Comida / Alimentación",
    icon: "🍽️",
    color: "hsl(25 95% 53%)",
    items: ["Desayuno", "Almuerzo", "Cena", "Refrigerios"],
  },
  {
    label: "Transporte",
    icon: "🚕",
    color: "hsl(217 91% 60%)",
    items: ["Taxi", "Remis", "Uber / Cabify", "Colectivo", "Tren", "Subte"],
  },
  {
    label: "Combustible",
    icon: "⛽",
    color: "hsl(0 84% 60%)",
    items: ["Nafta", "Gasoil", "GNC"],
  },
  {
    label: "Peajes",
    icon: "🛣️",
    color: "hsl(45 90% 50%)",
    items: ["Peajes de rutas y autopistas"],
  },
  {
    label: "Alojamiento",
    icon: "🏨",
    color: "hsl(280 80% 60%)",
    items: ["Hotel", "Hostal", "Apart hotel"],
  },
  {
    label: "Pasajes",
    icon: "✈️",
    color: "hsl(200 85% 55%)",
    items: ["Avión", "Ómnibus", "Tren"],
  },
  {
    label: "Estacionamiento",
    icon: "🚗",
    color: "hsl(160 60% 45%)",
    items: ["Playas de estacionamiento", "Garajes"],
  },
  {
    label: "Comunicación",
    icon: "📞",
    color: "hsl(190 80% 50%)",
    items: ["Internet", "Telefonía móvil", "Recargas"],
  },
  {
    label: "Materiales e insumos",
    icon: "🧰",
    color: "hsl(35 70% 45%)",
    items: ["Papelería", "Herramientas menores", "Material de trabajo"],
  },
  {
    label: "Representación",
    icon: "👔",
    color: "hsl(330 70% 55%)",
    items: ["Reuniones con clientes", "Almuerzos de negocios"],
  },
  {
    label: "Gastos imprevistos",
    icon: "🏥",
    color: "hsl(0 70% 50%)",
    items: ["Emergencias autorizadas", "Gastos extraordinarios"],
  },
  {
    label: "Otros",
    icon: "📄",
    color: "hsl(220 10% 50%)",
    items: ["Otros gastos"],
  },
];

export function findGroupForItem(item: string | null | undefined) {
  if (!item) return null;
  return CATEGORY_GROUPS.find(g => g.items.includes(item)) ?? null;
}
