import { requireAnyRole } from "@/lib/authz/require-role";
import { getCommentSettings, updateCommentSettings } from "@/features/moderation/settings-actions";
import { CommentSettingsForm } from "@/components/moderation/comment-settings-form";

export default async function CommentSettingsPage() {
  await requireAnyRole(["admin"]);
  const settings = await getCommentSettings();
  return <main className="page-shell admin-page min-h-[70vh] py-12 pb-20"><p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">Site settings</p><h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Comment controls</h1><p>Comments are checked when a reader posts. Moderators can remove a comment after it reaches the report threshold; admins can act on any reported comment.</p><CommentSettingsForm action={updateCommentSettings} enabled={settings.comments_enabled} threshold={settings.moderation_report_threshold} /></main>;
}
