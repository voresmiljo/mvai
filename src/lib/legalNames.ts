export function nameLegalReference(text: string): string {
  return text.replace(
    /(^|[^\p{L}])((?:artikel|art\.)\s*)(12|6)\b/giu,
    (match, prefix: string, _word: string, number: string, offset: number, full: string) => {
      const before = full.slice(0, offset + prefix.length).toLowerCase();
      if (/(?:direktivets|direktivet|lovens|bekendtgørelsens|bekendtgorelsens)\s*$/.test(before)) {
        return match;
      }
      return `${prefix}Habitatdirektivets artikel ${number}`;
    }
  );
}
