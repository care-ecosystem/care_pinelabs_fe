import { navigate } from "raviger";

const APPOINTMENT_SOURCE_URL_PATTERN =
  /^\/facility\/[^/?#]+\/patient\/[^/?#]+\/appointments\/[^/?#]+\/?$/;

export function redirectToAppointmentPrint(): boolean {
  const sourceUrl = new URLSearchParams(window.location.search).get(
    "sourceUrl"
  );
  if (!sourceUrl || !APPOINTMENT_SOURCE_URL_PATTERN.test(sourceUrl)) {
    return false;
  }

  const target = `${sourceUrl.replace(/\/$/, "")}/print`;
  navigate(target);
  return true;
}
