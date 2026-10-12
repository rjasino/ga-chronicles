import type { PeopleView, SortDir, SortKey } from "@/features/admin/people-view";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/text-field";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "username", label: "Username" },
  { value: "email", label: "Email" },
  { value: "status", label: "Status" },
  { value: "role", label: "Role" },
  { value: "created", label: "Account created" },
];

const DIR_OPTIONS: { value: SortDir; label: string }[] = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

/** GET form ordering the People & roles list; preserves the active filters. */
export function PeopleSort({ initial }: { initial: PeopleView }) {
  return (
    <form method="get" className="people-sort" aria-label="Sort people">
      <input type="hidden" name="q" value={initial.q} />
      <input type="hidden" name="role" value={initial.role} />
      <input type="hidden" name="status" value={initial.status} />
      <div className="people-sort__field"><Select label="Sort by" name="sort" defaultValue={initial.sort}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select></div>
      <div className="people-sort__field"><Select label="Order" name="dir" defaultValue={initial.dir}>
        {DIR_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select></div>
      <Button type="submit" purpose="secondary">Sort</Button>
    </form>
  );
}
