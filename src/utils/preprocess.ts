//helper functions for cleaning text
//remove HTML entities
function removeHTML(text: string): string {
  // Remove HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");
  return text;
}

//remove email headers
function removeEmailHeaders(text: string): string {
  return text.replace(/^(From|To|Sent|Subject):.*$/gm, "");
}
//remove URLs
function removeURLs(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "");
}

//remove extra whitespace
function removeExtraWhitespace(text: string): string {
  return text.replace(/\s+/g, " ");
}

//remove lines with only whitespace
function removeLinesWithOnlyWhitespace(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");
}

function removeNewLines(text: string, preserveNewlines: boolean): string {
  if (preserveNewlines) {
    // Remove repeated newlines (more than 2)
    text = text.replace(/\n{3,}/g, "\n\n");
  } else {
    // Replace all newlines with spaces
    text = text.replace(/\n/g, " ");
  }
  return text;
}
//trim whitespace
function trimWhitespace(text: string): string {
  return text.trim();
}

export function cleanText(
  text: string,
  preserveNewlines: boolean = true
): string {
  // Remove HTML entities
  text = removeHTML(text);

  // Remove email headers
  text = removeEmailHeaders(text);

  // Remove URLs
  text = removeURLs(text);

  // Remove extra whitespace
  text = removeExtraWhitespace(text);

  // Remove lines with only whitespace
  text = removeLinesWithOnlyWhitespace(text);

  // Remove newlines
  text = removeNewLines(text, preserveNewlines);

  //remove empty lines
  text = removeLinesWithOnlyWhitespace(text);

  //trim whitespace
  text = trimWhitespace(text);

  return text;
}
