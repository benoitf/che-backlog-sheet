import { DropDownInitializer } from "./drop-down-initializer";
import { GoogleSheet } from "./google-sheet";
import { ValidationProducer } from "./validation-producer";

// Class that will set validation on cells
export class TeamValidationUpdater {

  private validationProducer: ValidationProducer;

  constructor(private googleSheet: GoogleSheet, dropDownInitializer: DropDownInitializer, private sheetName: string, private sheetId: number) {
    this.validationProducer = new ValidationProducer(dropDownInitializer, sheetId);
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
    requests.push(this.validationProducer.getRangRequest(endRowIndex, header, "sprint"));

    // checkboxes
    requests.push(this.validationProducer.getCheckBoxRequest(endRowIndex, header, "Assignment"));

    await this.googleSheet.batchUpdateOneOfRangeRequests(requests);
  }

}
