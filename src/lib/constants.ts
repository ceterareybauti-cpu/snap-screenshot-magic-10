export const TRAINING_GOALS = [
  "Ganancia muscular",
  "Pérdida de grasa",
  "Fuerza",
  "Recomposición",
  "Fitness general",
  "Otro",
] as const;

export const TRAINING_EXPERIENCE = ["Principiante", "Intermedio", "Avanzado"] as const;

export const WEEK_DAYS = [
  { value: 1, label: "Lunes", short: "L" },
  { value: 2, label: "Martes", short: "M" },
  { value: 3, label: "Miércoles", short: "X" },
  { value: 4, label: "Jueves", short: "J" },
  { value: 5, label: "Viernes", short: "V" },
  { value: 6, label: "Sábado", short: "S" },
  { value: 0, label: "Domingo", short: "D" },
] as const;

export const MUSCLE_GROUPS = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Brazos",
  "Piernas",
  "Core",
  "Full body",
  "Cardio",
] as const;

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  goal: string | null;
  experience: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

const COMPLETION_FIELDS: (keyof ProfileRow)[] = [
  "full_name",
  "avatar_url",
  "date_of_birth",
  "weight_kg",
  "height_cm",
  "goal",
  "experience",
];

export function profileCompletion(profile: Partial<ProfileRow> | null | undefined): number {
  if (!profile) return 0;
  const filled = COMPLETION_FIELDS.filter((field) => {
    const value = profile[field];
    return value !== null && value !== undefined && value !== "";
  }).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}
