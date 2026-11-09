import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

type Namespace = keyof IntlMessages;
type IntlMessages = Awaited<ReturnType<typeof getMessages>>;

/**
 * Передаёт в браузер только нужные разделы переводов для клиентских компонентов внутри.
 * Так лендинг не тащит тексты формы, а страница результата — тексты лендинга.
 */
export async function ClientMessages({ namespaces, children }: { namespaces: Namespace[]; children: ReactNode }) {
  const messages = await getMessages();
  const picked = Object.fromEntries(namespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]));
  return <NextIntlClientProvider messages={picked}>{children}</NextIntlClientProvider>;
}
