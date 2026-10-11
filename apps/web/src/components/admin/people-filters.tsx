import type { PeopleView, RoleFilter, StatusFilter } from "@/features/admin/people-view";
import { Button } from "@/components/ui/button";
import { Select, TextField } from "@/components/ui/text-field";

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "any", label: "All roles" },
  { value: "reader", label: "Reader" },
  { value: "contributor", label: "Contributor" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "any", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

/** GET form narrowing the People & roles list by search, role, and status. */
export function PeopleFilters({ initial }: { initial: PeopleView }) {
  return (
    <form method="get" className="people-filters" role="search" aria-label="Filter people">
      <input type="hidden" name="sort" value={initial.sort} />
      <input type="hidden" name="dir" value={initial.dir} />
      <fieldset className="people-filters__fields">
        <legend className="field-label">Filter the list</legend>
        <div className="people-filters__field"><TextField label="Search" name="q" type="search" defaultValue={initial.q} placeholder="Name or email" autoComplete="off" /></div>
        <div className="people-filters__field"><Select label="Role" name="role" defaultValue={initial.role}>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select></div>
        <div className="people-filters__field"><Select label="Status" name="status" defaultValue={initial.status}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select></div>
        <Button type="submit" purpose="secondary">Apply filters</Button>
      </fieldset>
    </form>
  );
}
