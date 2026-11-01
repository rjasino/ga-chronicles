begin;
select plan(11);

select ok(not has_function_privilege('anon', 'public.search_email(public.accounts)', 'EXECUTE'), 'anon cannot execute email search');
select ok(not has_function_privilege('authenticated', 'public.search_email(public.accounts)', 'EXECUTE'), 'authenticated cannot execute email search');
select ok(not has_table_privilege('anon', 'public.account_auth_lookup', 'SELECT'), 'anon cannot read the private email lookup');
select ok(not has_table_privilege('authenticated', 'public.account_auth_lookup', 'SELECT'), 'authenticated cannot read the private email lookup');
select ok(has_function_privilege('service_role', 'public.search_email(public.accounts)', 'EXECUTE'), 'service_role can execute email search');
select ok(has_table_privilege('service_role', 'public.account_auth_lookup', 'SELECT'), 'service_role can read the private email lookup');

set local role anon;
select throws_ok(
  $$select public.search_email(null::public.accounts)$$,
  '42501',
  null,
  'anon cannot call email search'
);
select throws_ok(
  $$select email from public.account_auth_lookup$$,
  '42501',
  null,
  'anon cannot read email addresses'
);
reset role;

set local role authenticated;
select throws_ok(
  $$select public.search_email(null::public.accounts)$$,
  '42501',
  null,
  'authenticated cannot call email search'
);
select throws_ok(
  $$select email from public.account_auth_lookup$$,
  '42501',
  null,
  'authenticated cannot read email addresses'
);
reset role;

set local role service_role;
select results_eq(
  $$select id from public.accounts where public.search_email(accounts) = 'moderator@example.test'$$,
  $$values ('10000000-0000-4000-8000-000000000003'::uuid)$$,
  'service_role can filter accounts by computed email'
);

select * from finish();
rollback;
