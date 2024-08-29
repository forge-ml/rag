export function cleanText(
  text: string,
  preserveNewlines: boolean = true
): string {
  // Remove HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");

  // Remove email headers
  text = text.replace(/^(From|To|Sent|Subject):.*$/gm, "");

  // Remove URLs
  text = text.replace(/https?:\/\/\S+/g, "");

  // Remove extra whitespace
  text = text.replace(/\s+/g, " ");

  // Remove lines with only whitespace
  text = text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");

  if (preserveNewlines) {
    // Remove repeated newlines (more than 2)
    text = text.replace(/\n{3,}/g, "\n\n");
  } else {
    // Replace all newlines with spaces
    text = text.replace(/\n/g, " ");
  }

  // Trim leading and trailing whitespace
  text = text.trim();

  return text;
}
