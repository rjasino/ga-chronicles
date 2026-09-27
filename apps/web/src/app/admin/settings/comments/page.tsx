import { requireAnyRole } from "@/lib/authz/require-role";
import { getCommentSettings, updateCommentSettings } from "@/features/moderation/settings-actions";
import { CommentSettingsForm } from "@/components/moderation/comment-settings-form";

export default async function CommentSettingsPage() {
  await requireAnyRole(["admin"]);
  const settings = await getCommentSettings();
  return <main className="page-shell admin-page"><p className="article-type">Site settings</p><h1>Comment controls</h1><p>Comments are checked when a reader posts. Moderators can remove a comment after it reaches the report threshold; admins can act on any reported comment.</p><CommentSettingsForm action={updateCommentSettings} enabled={settings.comments_enabled} threshold={settings.moderation_report_threshold} /></main>;
}
