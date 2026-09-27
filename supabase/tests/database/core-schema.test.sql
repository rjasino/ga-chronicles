begin;
select plan(9);

select has_table('public', 'accounts', 'accounts table exists');
select has_table('public', 'account_auth_lookup', 'private sign-in email mapping exists');
select has_table('public', 'account_roles', 'role assignments table exists');
select has_table('public', 'articles', 'articles table exists');
select has_table('public', 'site_settings', 'site settings table exists');
select has_column('public', 'accounts', 'username', 'accounts have usernames');
select has_index('public', 'account_roles', 'account_roles_account_id_role_key_key', 'role grant is unique');
select ok((select moderation_report_threshold > 0 from public.site_settings limit 1), 'threshold is positive');

set local role anon;
select is_empty($$select id from public.articles where status = 'draft'$$, 'anonymous cannot read drafts');

select * from finish();
rollback;
