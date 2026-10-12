import { redirect } from "next/navigation";
import { ForbiddenError } from "@/lib/authz";
import { ValidationError } from "@/lib/services/classification";
import type { Answers } from "@/lib/content/types";
import type { Actor } from "@/lib/services/audit";

/**
 * Runs a server action body and redirects. Expected failures (validation,
 * permission) come back to `back` as a visible ?error= message; anything
 * else is a bug and is rethrown. `fn` returns where to go on success and an
 * optional notice.
 */
export async function run(back: string, fn: () => Promise<{ to?: string; notice?: string } | void>): Promise<never> {
  let result: { to?: string; notice?: string } | void;
  try {
    result = await fn();
  } catch (e) {
    if (e instanceof ValidationError || e instanceof ForbiddenError) redirect(withParam(back, "error", e.message));
    throw e;
  }
  const to = result?.to ?? back;
  redirect(result?.notice ? withParam(to, "notice", result.notice) : to);
}

function withParam(path: string, key: string, value: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("notice");
  params.delete("error");
  params.set(key, value);
  return `${base}?${params}`;
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function strOrNull(form: FormData, key: string): string | null {
  return str(form, key) || null;
}

export function actor(ctx: { userId: string; userName: string; orgId: string }): Actor {
  return { userId: ctx.userId, userName: ctx.userName, orgId: ctx.orgId };
}

export function parseAnswers(form: FormData): Answers {
  try {
    const parsed = JSON.parse(str(form, "answers") || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Answers;
  } catch {}
  throw new ValidationError("The answers could not be read. Please try again.");
}
