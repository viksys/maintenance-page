/*
  /onboarding — the intern detail form.

  Posts to the Apps Script in the VIKASANA HR kit (WebForm.gs, added beside
  Code.gs in the project that reaches the Candidates sheet). That script writes
  the details into the intern's row and schedules the offer letter and the NDA
  for a random 5–15 minutes later; they are then mailed to
  info@vikasanasystems.tech to be forwarded.

  The endpoint is not a secret: it is in the shipped bundle and anyone can read
  it. What protects the sheet is that the script only ever writes the fields an
  intern owns — name, email, mobile, address — into a row HR has already seeded
  with the role, the dates and the reference numbers. It exposes no read path.

  Empty until deployed. While it is empty the page says so and shows no form: a
  form that posts nowhere is worse than an honest closed sign, because the
  intern believes their details are in and nobody finds out until the documents
  do not arrive.
*/
export const ONBOARDING_ENDPOINT =
  process.env.REACT_APP_ONBOARDING_ENDPOINT ||
  'https://script.google.com/macros/s/AKfycbwe1UeuUYHm8HSszlyjGBdJt_C8RZeRiFxzRQsj62hw08bREYGfquRNUV1G-gesSZMg/exec';

export const ONBOARDING_READY = Boolean(ONBOARDING_ENDPOINT);

/*
  NO TIME IS PROMISED TO THE INTERN, AND THAT IS STILL DELIBERATE.

  The script waits a random 5–15 minutes before the documents are generated and
  mailed to info@vikasanasystems.tech, and the intern receives nothing until
  someone there forwards them. Two unknowns in series, so there is no delivery
  time this page can honestly print.

  An intern given a figure who has nothing by it submits again, the script
  refuses the second submission, and the refusal reads as a broken form. The
  confirmation says the documents are being prepared and gives an address to
  chase instead.
*/
