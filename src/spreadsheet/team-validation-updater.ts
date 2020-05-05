import { GoogleSheet } from "./google-sheet";
import { ValidationProducer } from "./validation-producer";

// Class that will set validation on cells
export class TeamValidationUpdater {

  private validationProducer: ValidationProducer;

  constructor(private googleSheet: GoogleSheet, private sheetName: string, private sheetId: number) {
    this.validationProducer = new ValidationProducer(sheetId);
  }

  public async update(): Promise<void> {
    // first, check the number of rows
    const sheetData: any = await this.googleSheet.getData({ range: `${this.sheetName}!A1:Z` });
    const rows = sheetData.values;
    const rowLength = rows.length;
    const header = rows[0];

    // get column of sizing
    const endRowIndex = rowLength;

    // now prepare the requests
    const requests = [];
    // checkboxes
    requests.push(this.validationProducer.getCheckBoxRequest(endRowIndex, header, "Assignment"));

    await this.googleSheet.batchUpdateOneOfRangeRequests(requests);
  }

}
