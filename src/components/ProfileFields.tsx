import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINING_EXPERIENCE, TRAINING_GOALS } from "@/lib/constants";

export type ProfileFormValues = {
  full_name: string;
  date_of_birth: string;
  weight_kg: string;
  height_cm: string;
  goal: string;
  experience: string;
  notes: string;
};

export function ProfileFields({
  value,
  onChange,
}: {
  value: ProfileFormValues;
  onChange: (next: ProfileFormValues) => void;
}) {
  const set = (patch: Partial<ProfileFormValues>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          value={value.full_name}
          onChange={(e) => set({ full_name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dob">Fecha de nacimiento</Label>
        <Input
          id="dob"
          type="date"
          value={value.date_of_birth}
          onChange={(e) => set({ date_of_birth: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="weight">Peso (kg)</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          value={value.weight_kg}
          onChange={(e) => set({ weight_kg: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="height">Altura (cm)</Label>
        <Input
          id="height"
          type="number"
          step="0.1"
          value={value.height_cm}
          onChange={(e) => set({ height_cm: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Objetivo</Label>
        <Select value={value.goal} onValueChange={(goal) => set({ goal })}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir objetivo" />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_GOALS.map((goal) => (
              <SelectItem key={goal} value={goal}>
                {goal}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Experiencia</Label>
        <Select value={value.experience} onValueChange={(experience) => set({ experience })}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir experiencia" />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_EXPERIENCE.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notas adicionales</Label>
        <Textarea
          id="notes"
          rows={3}
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
