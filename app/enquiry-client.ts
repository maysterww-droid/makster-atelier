import type { Lang } from "./content";
import { trackMaksterEvent } from "./interaction-analytics";

export type EnquiryState = "idle" | "sending" | "sent" | "error";

export const enquiryFeedback: Record<Lang, { sending: string; sent: string; error: string; files: string }> = {
  cs: { sending: "Odesíláme…", sent: "Děkujeme. Ozveme se vám co nejdříve.", error: "Zprávu se nepodařilo odeslat. Zavolejte nám nebo napište e-mail.", files: "PDF nebo obrázky, maximálně 2,5 MB celkem" },
  ru: { sending: "Отправляем…", sent: "Спасибо. Мы свяжемся с вами в ближайшее время.", error: "Не удалось отправить заявку. Позвоните нам или напишите на email.", files: "PDF или изображения, максимум 2,5 МБ суммарно" },
  ua: { sending: "Надсилаємо…", sent: "Дякуємо. Ми зв’яжемося з вами найближчим часом.", error: "Не вдалося надіслати заявку. Зателефонуйте нам або напишіть на email.", files: "PDF або зображення, максимум 2,5 МБ загалом" },
  en: { sending: "Sending…", sent: "Thank you. We will contact you shortly.", error: "We could not send the enquiry. Please call or email us.", files: "PDF or images, 2.5 MB total maximum" },
  pl: { sending: "Wysyłamy…", sent: "Dziękujemy. Wkrótce się z Państwem skontaktujemy.", error: "Nie udało się wysłać zapytania. Prosimy zadzwonić lub napisać e-mail.", files: "PDF lub obrazy, maksymalnie 2,5 MB łącznie" },
  de: { sending: "Wird gesendet…", sent: "Vielen Dank. Wir melden uns in Kürze bei Ihnen.", error: "Die Anfrage konnte nicht gesendet werden. Bitte rufen Sie uns an oder schreiben Sie eine E-Mail.", files: "PDF oder Bilder, insgesamt maximal 2,5 MB" },
};

export async function sendEnquiry(form: HTMLFormElement, language: Lang, source: string) {
  const data = new FormData(form);
  data.set("language", language);
  data.set("source", source);
  data.set("_subject", "New MAKSTER ATELIER enquiry");
  data.set("_template", "table");
  data.set("_captcha", "false");
  data.set("_honey", String(data.get("company") || ""));
  data.delete("company");

  const contact = String(data.get("contact") || "");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) data.set("email", contact);

  const response = await fetch("https://formsubmit.co/ajax/info@maksteratelier.com", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: data,
  });
  const result = (await response.json().catch(() => null)) as { success?: boolean | string; message?: string } | null;
  if (!response.ok || result?.success === "false" || result?.success === false) {
    throw new Error(result?.message || "Enquiry failed");
  }
  trackMaksterEvent("enquiry_submitted", { source, language });
}
