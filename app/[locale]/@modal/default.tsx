// Слот попапа пуст, когда попап не открыт (загрузка страницы, обновление).
//
// Здесь намеренно нет @modal/page.tsx для главной: рядом с app/[locale]/page.tsx он вызывает
// в `next dev` (Next.js 16.4, Turbopack) бесконечную перезагрузку главной. Попап и без него
// закрывается шагом назад (router.back) или переходом на другую страницу (@modal/[...rest]).
export default function ModalDefault() {
  return null;
}
