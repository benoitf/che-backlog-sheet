import { BodyResponseCallback } from "googleapis-common";
import { GoogleSheet } from "./google-sheet";

/**
 * Class handling the data validation that can be added
 */
export class DropDownInitializer {

  private mapping = new Map<string, string>();

  constructor(private googleSheet: GoogleSheet, private sheetName: string) {

  }

  // Search the key with include as it may not be the same exact title
  public getRange(key: string): string {
    let foundValue = "";
    Array.from(this.mapping.entries()).forEach((entry) => {
      if (entry[0].includes(key)) {
        foundValue = entry[1];
      }
    });
    return foundValue;
  }

  public async init(): Promise<void> {

    // read all data from first column, and then populate map
    const data: any = await this.googleSheet.getData({ range: `${this.sheetName}!A1:A` });

    // grab rows
    const rows = data.values;

    // will perform a loop line by line
    let index = 0;
    let started = false;
    let currentTitle = "";
    let rowStart = 0;
    while (index < rows.length) {

      // grab cellContent, [0] for the first column
      const cellContent = rows[index][0];

      // if group has not yet be started and we have content, start the group
      if (!started && cellContent && cellContent.length > 0) {
        currentTitle = cellContent;
        rowStart = index + 2;
        started = true;
      }

      // no more content, stop the current group
      if (started && !cellContent) {
        this.mapping.set(currentTitle.toLowerCase(), `='${this.sheetName}'!A${rowStart}:A${index}`);
        started = false;
      }

      index++;
    }
  }

}
