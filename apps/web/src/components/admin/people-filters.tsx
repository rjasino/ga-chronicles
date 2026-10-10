import type { PeopleView, RoleFilter, StatusFilter } from "@/features/admin/people-view";

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
      <fieldset className="people-filters__fields">
        <legend className="field-label">Filter the list</legend>
        <label className="people-filters__field">
          <span className="field-label">Search</span>
          <input name="q" type="search" defaultValue={initial.q} placeholder="Name or email" autoComplete="off" />
        </label>
        <label className="people-filters__field">
          <span className="field-label">Role</span>
          <select name="role" defaultValue={initial.role}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="people-filters__field">
          <span className="field-label">Status</span>
          <select name="status" defaultValue={initial.status}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <button className="button-secondary" type="submit">Apply filters</button>
      </fieldset>
    </form>
  );
}