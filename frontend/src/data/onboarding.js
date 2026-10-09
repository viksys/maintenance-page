/*
  /onboarding — the intern detail form.

  Posts to the Apps Script in the VIKASANA HR kit (WebForm.gs, added beside
  Code.gs in the project bound to the Candidates sheet). That script writes the
  details into the intern's row and schedules the offer letter and NDA for a
  random 10–15 minutes later.

  The endpoint is not a secret: it is in the shipped bundle and anyone can read
  it. What protects the sheet is that the script only ever writes the fields an
  intern owns — name, email, mobile, address — into a row HR has already seeded
  with the role, the dates and the reference numbers. It exposes no read path.

  Empty until deployed. While it is empty the page says so and shows no form: a
  form that posts nowhere is worse than an honest closed sign, because the
  intern believes their details are in and nobody finds out until the documents
  do not arrive.
*/
export const ONBOARDING_ENDPOINT = process.env.REACT_APP_ONBOARDING_ENDPOINT || '';

export const ONBOARDING_READY = Boolean(ONBOARDING_ENDPOINT);

/*
  NO TIME IS PROMISED TO THE INTERN, AND THAT IS DELIBERATE.

  The script's 10–15 minute delay is the wait before the documents are generated
  and mailed to info@vikasanasystems.tech. They then reach the intern only when
  someone there forwards them — so the figure describes our half of the process,
  not theirs, and printing it on the confirmation would promise a delivery time
  nothing in the chain guarantees.

  An intern told "15 minutes" who has nothing after twenty submits again, which
  the script refuses, which reads as a broken form. The confirmation says the
  documents are being prepared and gives an address to chase instead.
*/
