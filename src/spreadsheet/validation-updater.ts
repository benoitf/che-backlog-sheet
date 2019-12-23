import { DropDownInitializer } from "./drop-down-initializer";
import { GoogleSheet } from "./google-sheet";
import { ValidationProducer } from "./validation-producer";

// Class that will set validation on cells
export class ValidationUpdater {

  private sheetName: string = "backlog";

  private validationProducer: ValidationProducer;

  constructor(private googleSheet: GoogleSheet, private dropDownInitializer: DropDownInitializer) {
    this.validationProducer = new ValidationProducer(dropDownInitializer, 0);
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
    requests.push(this.validationProducer.getRangRequest(endRowIndex, header, "sizing"));
    requests.push(this.validationProducer.getRangRequest(endRowIndex, header, "theme"));
    requests.push(this.validationProducer.getRangRequest(endRowIndex, header, "quarter"));
    requests.push(this.validationProducer.getRangRequest(endRowIndex, header, "status"));
    requests.push(this.validationProducer.getRangRequest(endRowIndex, header, "team"));

    // checkboxes
    requests.push(this.validationProducer.getCheckBoxRequest(endRowIndex, header, "Include"));
    requests.push(this.validationProducer.getCheckBoxRequest(endRowIndex, header, "Needed CRW"));
    requests.push(this.validationProducer.getCheckBoxRequest(endRowIndex, header, "QE Impact"));
    requests.push(this.validationProducer.getCheckBoxRequest(endRowIndex, header, "Doc Impact"));

    await this.googleSheet.batchUpdateOneOfRangeRequests(requests);
  }

}
